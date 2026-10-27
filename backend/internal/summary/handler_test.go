package summary

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/quota"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// ---------- in-memory Redis (miniredis) ----------

// fakeRedis wraps miniredis so the quota Checker runs against real Redis
// semantics (MULTI/EXEC, EXPIRE NX) without a server.
type fakeRedis struct{ mr *miniredis.Miniredis }

const quotaKeyPrefix = "ratelimit:autogen:daily:"

// todayKey matches quota.userKey: the counter is per user per UTC day.
func todayKey(userID string) string {
	return quotaKeyPrefix + userID + ":" + time.Now().UTC().Format("2006-01-02")
}

func newQuotaChecker(t *testing.T, limit int, used map[string]int) (*quota.Checker, *fakeRedis) {
	t.Helper()
	mr := miniredis.RunT(t)
	_ = mr.Set("app:config:autogen_daily_quota", strconv.Itoa(limit))
	for u, n := range used {
		_ = mr.Set(todayKey(u), strconv.Itoa(n))
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return quota.NewChecker(rdb, nil), &fakeRedis{mr: mr}
}

func (f *fakeRedis) used(userID string) int {
	v, err := f.mr.Get(todayKey(userID))
	if err != nil {
		return 0
	}
	n, _ := strconv.Atoi(v)
	return n
}

// ---------- helpers ----------

const testUser = "u1"

type harness struct {
	repo     *fakeRepo
	llm      *fakeLLM
	provider *fakeProvider
	redis    *fakeRedis
	h        *Handler
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	tc := newTripContext()
	tc.TripID = "t1"
	hs := &harness{
		repo:     &fakeRepo{},
		llm:      &fakeLLM{resp: "A lovely trip summary."},
		provider: &fakeProvider{ctx: tc},
	}
	q, fr := newQuotaChecker(t, 5, nil)
	hs.redis = fr
	hs.h = NewHandler(NewUsecase(hs.repo, hs.llm, hs.provider, "test-model")).WithQuota(q)
	return hs
}

func call(t *testing.T, fn func(echo.Context, string) error, method, tripID, userID string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	req := httptest.NewRequest(method, "/trips/"+tripID+"/summary", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(tripID)
	if userID != "" {
		c.Set(middleware.UserIDKey, userID)
	}
	return rec, middleware.WithUser(fn)(c)
}

func wantHTTPErr(t *testing.T, err error, code int) *echo.HTTPError {
	t.Helper()
	var he *echo.HTTPError
	if !errors.As(err, &he) {
		t.Fatalf("err = %v, want *echo.HTTPError %d", err, code)
	}
	if he.Code != code {
		t.Fatalf("status = %d, want %d (msg=%v)", he.Code, code, he.Message)
	}
	return he
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}
	return body
}

// ---------- tests ----------

func TestHandler_MissingUser_401(t *testing.T) {
	hs := newHarness(t)
	for name, fn := range map[string]func(echo.Context, string) error{
		"generate": hs.h.Generate, "get": hs.h.Get, "delete": hs.h.Delete,
	} {
		t.Run(name, func(t *testing.T) {
			_, err := call(t, fn, http.MethodGet, "t1", "")
			wantHTTPErr(t, err, http.StatusUnauthorized)
		})
	}
	if hs.llm.called {
		t.Error("LLM must not be called without a user")
	}
	if got := hs.redis.used(testUser); got != 0 {
		t.Errorf("quota used = %d, want 0", got)
	}
}

func TestHandlerGenerate_Success(t *testing.T) {
	hs := newHarness(t)
	rec, err := call(t, hs.h.Generate, http.MethodPost, "t1", testUser)
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	body := decode(t, rec)
	if body["trip_id"] != "t1" || body["content"] != "A lovely trip summary." || body["model"] != "test-model" {
		t.Errorf("unexpected body: %v", body)
	}
	for _, k := range []string{"id", "source_updated_at", "is_outdated", "created_at", "updated_at"} {
		if _, ok := body[k]; !ok {
			t.Errorf("body missing %q", k)
		}
	}
	if !hs.llm.called {
		t.Error("expected LLM call on generate")
	}
	if got := hs.redis.used(testUser); got != 1 {
		t.Errorf("quota used = %d, want 1", got)
	}
}

func TestHandlerGenerate_QuotaExceeded_429(t *testing.T) {
	hs := newHarness(t)
	q, fr := newQuotaChecker(t, 2, map[string]int{testUser: 2})
	hs.h.WithQuota(q)

	_, err := call(t, hs.h.Generate, http.MethodPost, "t1", testUser)
	he := wantHTTPErr(t, err, http.StatusTooManyRequests)
	msg, ok := he.Message.(map[string]any)
	if !ok || msg["code"] != "DAILY_QUOTA_EXCEEDED" || msg["limit"] != 2 {
		t.Errorf("message = %#v", he.Message)
	}
	if hs.llm.called {
		t.Error("LLM must not be called when quota is exhausted")
	}
	if got := fr.used(testUser); got != 2 {
		t.Errorf("quota used = %d, want 2 (rejected call must not count)", got)
	}
}

func TestHandlerGenerate_QuotaDisabled(t *testing.T) {
	hs := newHarness(t)
	hs.h.WithQuota(quota.NewChecker(nil, nil))
	rec, err := call(t, hs.h.Generate, http.MethodPost, "t1", testUser)
	if err != nil || rec.Code != http.StatusOK {
		t.Fatalf("err=%v status=%d, want 200", err, rec.Code)
	}
}

func TestHandlerGenerate_ErrorMapping(t *testing.T) {
	tests := []struct {
		name        string
		providerErr error
		llmErr      error
		llmResp     string
		saveErr     error
		wantStatus  int
		wantCode    string
		wantUsed    int // quota counter after the call; every failure is refunded
	}{
		{name: "trip forbidden", providerErr: apperr.ErrForbidden, wantStatus: http.StatusForbidden, wantUsed: 0},
		{name: "summary forbidden", providerErr: ErrForbidden, wantStatus: http.StatusForbidden, wantUsed: 0},
		{name: "trip not found", providerErr: ErrNotFound, wantStatus: http.StatusNotFound, wantUsed: 0},
		{name: "llm error refunds quota", llmErr: errors.New("upstream 502"), wantStatus: http.StatusServiceUnavailable, wantCode: "LLM_UNAVAILABLE", wantUsed: 0},
		{name: "llm empty refunds quota", llmResp: "", wantStatus: http.StatusServiceUnavailable, wantCode: "LLM_UNAVAILABLE", wantUsed: 0},
		{name: "save fails", saveErr: errors.New("db down"), llmResp: "ok", wantStatus: http.StatusInternalServerError, wantUsed: 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hs := newHarness(t)
			hs.provider.err = tt.providerErr
			hs.llm.err = tt.llmErr
			hs.llm.resp = tt.llmResp
			hs.repo.saveErr = tt.saveErr

			_, err := call(t, hs.h.Generate, http.MethodPost, "t1", testUser)
			he := wantHTTPErr(t, err, tt.wantStatus)
			if tt.wantCode != "" {
				msg, ok := he.Message.(map[string]any)
				if !ok || msg["code"] != tt.wantCode {
					t.Errorf("message = %#v, want code %s", he.Message, tt.wantCode)
				}
			}
			if got := hs.redis.used(testUser); got != tt.wantUsed {
				t.Errorf("quota used = %d, want %d", got, tt.wantUsed)
			}
		})
	}
}

func TestHandlerGet_ReturnsCachedWithoutLLMOrQuota(t *testing.T) {
	hs := newHarness(t)
	updated := time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
	hs.repo.stored = &Summary{
		ID: "s9", TripID: "t1", Content: "cached", Model: "m0",
		IsOutdated: true, UpdatedAt: updated,
	}

	rec, err := call(t, hs.h.Get, http.MethodGet, "t1", testUser)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	body := decode(t, rec)
	if body["id"] != "s9" || body["content"] != "cached" || body["is_outdated"] != true {
		t.Errorf("unexpected body: %v", body)
	}
	if body["updated_at"] != updated.Format(time.RFC3339) {
		t.Errorf("updated_at = %v", body["updated_at"])
	}
	if hs.llm.called {
		t.Error("GET must serve the cached summary, not call the LLM")
	}
	if got := hs.redis.used(testUser); got != 0 {
		t.Errorf("GET consumed quota: used = %d", got)
	}
}

func TestHandlerGet_ErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		ownerErr   error
		getErr     error
		wantStatus int
	}{
		{"forbidden (apperr)", apperr.ErrForbidden, nil, http.StatusForbidden},
		{"forbidden (summary)", ErrForbidden, nil, http.StatusForbidden},
		{"trip missing", ErrNotFound, nil, http.StatusNotFound},
		{"repo failure", nil, errors.New("boom"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hs := newHarness(t)
			hs.repo.verifyOwnerErr = tt.ownerErr
			hs.repo.getErr = tt.getErr
			_, err := call(t, hs.h.Get, http.MethodGet, "t1", testUser)
			wantHTTPErr(t, err, tt.wantStatus)
		})
	}
}

// A trip without a summary yet answers 204 (not a 404 error in the browser console).
func TestHandlerGet_NoSummaryYet(t *testing.T) {
	hs := newHarness(t)
	hs.repo.getErr = ErrNotFound
	rec, err := call(t, hs.h.Get, http.MethodGet, "t1", testUser)
	if err != nil {
		t.Fatalf("err = %v, want nil", err)
	}
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}

func TestHandlerDelete(t *testing.T) {
	tests := []struct {
		name       string
		ownerErr   error
		delErr     error
		wantStatus int
	}{
		{"success", nil, nil, http.StatusNoContent},
		{"forbidden", apperr.ErrForbidden, nil, http.StatusForbidden},
		{"not found", nil, ErrNotFound, http.StatusNotFound},
		{"repo failure", nil, errors.New("boom"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hs := newHarness(t)
			hs.repo.verifyOwnerErr = tt.ownerErr
			hs.repo.delErr = tt.delErr
			rec, err := call(t, hs.h.Delete, http.MethodDelete, "t1", testUser)
			if tt.wantStatus == http.StatusNoContent {
				if err != nil {
					t.Fatalf("Delete: %v", err)
				}
				if rec.Code != http.StatusNoContent || rec.Body.Len() != 0 {
					t.Errorf("status = %d body=%q, want 204 empty", rec.Code, rec.Body.String())
				}
				return
			}
			wantHTTPErr(t, err, tt.wantStatus)
		})
	}
}

func callWithBody(t *testing.T, fn func(echo.Context, string) error, tripID, body string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/trips/"+tripID+"/summary", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(tripID)
	c.Set(middleware.UserIDKey, testUser)
	return rec, middleware.WithUser(fn)(c)
}

func TestHandlerGenerate_Language(t *testing.T) {
	t.Run("default is Indonesian", func(t *testing.T) {
		hs := newHarness(t)
		if _, err := call(t, hs.h.Generate, http.MethodPost, "t1", testUser); err != nil {
			t.Fatal(err)
		}
		if strings.Contains(hs.llm.lastSystem, "BAHASA OUTPUT") {
			t.Error("no language must keep the Indonesian prompt")
		}
	})
	t.Run("en asks for English", func(t *testing.T) {
		hs := newHarness(t)
		if _, err := callWithBody(t, hs.h.Generate, "t1", `{"language":"en"}`); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(hs.llm.lastSystem, "bahasa Inggris") || !strings.Contains(hs.llm.lastSystem, "## Overview") {
			t.Error("language en must add the English output instruction")
		}
	})
	t.Run("unknown language is 400 and uses no quota", func(t *testing.T) {
		hs := newHarness(t)
		_, err := callWithBody(t, hs.h.Generate, "t1", `{"language":"fr"}`)
		wantHTTPErr(t, err, http.StatusBadRequest)
		if hs.llm.called || hs.redis.used(testUser) != 0 {
			t.Error("invalid language must not call the LLM or use quota")
		}
	})
}
