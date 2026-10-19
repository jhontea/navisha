package autogen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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

// ---------- stub usecase ----------

type stubUsecase struct {
	draft     *TripDraft
	draftErr  error
	preview   *DayPreview
	prevErr   error
	tripID    string
	createErr error

	genCalls    int
	genIn       GenerateInput
	prevCalls   int
	prevIn      GenerateDayInput
	createCalls int
	createArgs  []string
}

func (s *stubUsecase) GenerateDraft(_ context.Context, _ string, in GenerateInput) (*TripDraft, error) {
	s.genCalls++
	s.genIn = in
	return s.draft, s.draftErr
}

func (s *stubUsecase) GenerateDayPreview(_ context.Context, _ string, in GenerateDayInput) (*DayPreview, error) {
	s.prevCalls++
	s.prevIn = in
	return s.preview, s.prevErr
}

func (s *stubUsecase) CreateFromDraft(_ context.Context, _ string, _ TripDraft, start, end, cover, desc string) (string, error) {
	s.createCalls++
	s.createArgs = []string{start, end, cover, desc}
	return s.tripID, s.createErr
}

// ---------- helpers ----------

const testUser = "u1"

func newTestHandler(t *testing.T, limit int, used int) (*Handler, *stubUsecase, *fakeRedis) {
	t.Helper()
	uc := &stubUsecase{
		draft:   &TripDraft{Title: "Tokyo Trip", Destination: "Tokyo", TotalDays: 2},
		preview: &DayPreview{Theme: "Food", Activities: []ActivityDraft{{Type: "note", Title: "Ramen"}}},
		tripID:  "trip-123",
	}
	q, fr := newQuotaChecker(t, limit, map[string]int{testUser: used})
	return NewHandler(uc).WithQuota(q), uc, fr
}

type reqOpts struct {
	body   string
	user   string
	params map[string]string
}

func do(t *testing.T, fn func(echo.Context, string) error, method string, o reqOpts) (*httptest.ResponseRecorder, error) {
	t.Helper()
	var body io.Reader
	if o.body != "" {
		body = strings.NewReader(o.body)
	}
	req := httptest.NewRequest(method, "/", body)
	if o.body != "" {
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	}
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	if len(o.params) > 0 {
		var names, values []string
		for k, v := range o.params {
			names = append(names, k)
			values = append(values, v)
		}
		c.SetParamNames(names...)
		c.SetParamValues(values...)
	}
	if o.user != "" {
		c.Set(middleware.UserIDKey, o.user)
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

func errCode(he *echo.HTTPError) any {
	if m, ok := he.Message.(map[string]any); ok {
		return m["code"]
	}
	return nil
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}
	return body
}

func genBody(dest, desc, start, end string) string {
	b, _ := json.Marshal(map[string]string{
		"destination": dest, "description": desc,
		"start_date": start, "end_date": end, "base_currency": "JPY",
	})
	return string(b)
}

// ---------- auth ----------

func TestHandler_MissingUser_401(t *testing.T) {
	h, uc, _ := newTestHandler(t, 5, 0)
	for name, fn := range map[string]func(echo.Context, string) error{
		"generate": h.Generate, "from-draft": h.CreateFromDraft,
		"day-preview": h.GenerateDayPreview, "quota": h.GetQuota,
	} {
		t.Run(name, func(t *testing.T) {
			_, err := do(t, fn, http.MethodPost, reqOpts{body: "{}"})
			wantHTTPErr(t, err, http.StatusUnauthorized)
		})
	}
	if uc.genCalls+uc.prevCalls+uc.createCalls != 0 {
		t.Error("usecase must not be called without a user")
	}
}

// ---------- Generate ----------

func TestHandlerGenerate_Validation(t *testing.T) {
	const bad, unprocessable = http.StatusBadRequest, http.StatusUnprocessableEntity
	tests := []struct {
		name     string
		body     string
		wantCode int
		wantMsg  string
	}{
		{"malformed json", `{"destination":`, bad, "invalid body"},
		{"wrong type", `{"destination":123}`, bad, "invalid body"},
		{"missing start_date", genBody("Tokyo", "", "", "2026-11-02"), bad, "invalid start_date"},
		{"bad start_date", genBody("Tokyo", "", "01/11/2026", "2026-11-02"), bad, "invalid start_date"},
		{"bad end_date", genBody("Tokyo", "", "2026-11-01", "2026-13-40"), bad, "invalid end_date"},
		// The usecase's own rules run before quota is consumed.
		{"missing destination", genBody("", "", "2026-11-01", "2026-11-02"), unprocessable, "destination required"},
		{"blank destination", genBody("   ", "", "2026-11-01", "2026-11-02"), unprocessable, "destination required"},
		{"html-only destination", genBody("<b></b>", "", "2026-11-01", "2026-11-02"), unprocessable, "destination required"},
		{"symbols-only destination", genBody("!!!", "", "2026-11-01", "2026-11-02"), unprocessable, "must contain letters"},
		{"destination too long", genBody(strings.Repeat("a", MaxDestinationLen+1), "", "2026-11-01", "2026-11-02"), unprocessable, "destination too long"},
		{"description too long", genBody("Tokyo", strings.Repeat("a", MaxDescriptionLen+1), "2026-11-01", "2026-11-02"), unprocessable, "description too long"},
		{"end before start", genBody("Tokyo", "", "2026-11-05", "2026-11-01"), unprocessable, "end date before start date"},
		{"trip too long", genBody("Tokyo", "", "2026-11-01", "2026-11-30"), unprocessable, "trip too long"},
		{"no currency", `{"destination":"Tokyo","start_date":"2026-11-01","end_date":"2026-11-02"}`, unprocessable, "base currency required"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, fr := newTestHandler(t, 5, 0)
			_, err := do(t, h.Generate, http.MethodPost, reqOpts{body: tt.body, user: testUser})
			he := wantHTTPErr(t, err, tt.wantCode)
			if msg := fmt.Sprint(he.Message); !strings.Contains(msg, tt.wantMsg) {
				t.Errorf("message = %v, want it to contain %q", he.Message, tt.wantMsg)
			}
			if uc.genCalls != 0 {
				t.Error("usecase must not be called on invalid input")
			}
			if got := fr.used(testUser); got != 0 {
				t.Errorf("invalid input consumed quota: used = %d", got)
			}
		})
	}
}

func TestHandlerGenerate_Success(t *testing.T) {
	h, uc, fr := newTestHandler(t, 5, 0)
	body := genBody("<b>Tokyo</b>  Japan", "eat <script>x</script>ramen", "2026-11-01", "2026-11-02")
	rec, err := do(t, h.Generate, http.MethodPost, reqOpts{body: body, user: testUser})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	resp := decodeBody(t, rec)
	if resp["start_date"] != "2026-11-01" || resp["end_date"] != "2026-11-02" {
		t.Errorf("dates not echoed: %v", resp)
	}
	draft, ok := resp["draft"].(map[string]any)
	if !ok || draft["title"] != "Tokyo Trip" {
		t.Errorf("draft = %v", resp["draft"])
	}
	// Inputs are sanitized and parsed before reaching the usecase.
	if uc.genIn.Destination != "Tokyo Japan" {
		t.Errorf("destination passed = %q, want sanitized", uc.genIn.Destination)
	}
	if uc.genIn.Description != "eat xramen" {
		t.Errorf("description passed = %q, want sanitized", uc.genIn.Description)
	}
	if uc.genIn.BaseCurrency != "JPY" || uc.genIn.StartDate.Format("2006-01-02") != "2026-11-01" ||
		uc.genIn.EndDate.Format("2006-01-02") != "2026-11-02" {
		t.Errorf("input = %+v", uc.genIn)
	}
	if got := fr.used(testUser); got != 1 {
		t.Errorf("quota used = %d, want 1", got)
	}
}

const eventBody = `{"destination":"Ancol, Jakarta","start_date":"2026-11-07","end_date":"2026-11-08","base_currency":"IDR",
	"origin":{"label":"<b>Majalengka</b>","address":"Majalengka, Jawa Barat","lat":-6.83,"lng":108.22},
	"transport_mode":" Car ",
	"event":{"name":"Fan <i>Meeting</i>","venue":{"label":"Beach City International Stadium","lat":-6.12,"lng":106.84},
		"date":"2026-11-07","start_time":"14:00","end_time":"17:00"},
	"travelers":{"adults":2,"children":1,"child_ages":[5]},
	"budget_amount":3000000,"needs":["hotel_near_venue","kids_playground"]}`

func TestHandlerGenerate_EventTripFields(t *testing.T) {
	h, uc, _ := newTestHandler(t, 5, 0)
	if _, err := do(t, h.Generate, http.MethodPost, reqOpts{body: eventBody, user: testUser}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	in := uc.genIn
	if in.Origin == nil || in.Origin.Label != "Majalengka" || in.Origin.Lat == nil {
		t.Errorf("origin = %+v, want sanitized with coordinates", in.Origin)
	}
	if in.TransportMode != "car" {
		t.Errorf("transport mode = %q", in.TransportMode)
	}
	if in.Event == nil || in.Event.Name != "Fan Meeting" || in.Event.Date.Format("2006-01-02") != "2026-11-07" ||
		in.Event.StartTime != "14:00" || in.Event.Venue.Label != "Beach City International Stadium" {
		t.Errorf("event = %+v", in.Event)
	}
	if in.Travelers == nil || in.Travelers.Children != 1 || in.BudgetAmount != 3000000 || len(in.Needs) != 2 {
		t.Errorf("input = %+v", in)
	}
}

func TestHandlerGenerate_EventTripValidation(t *testing.T) {
	tests := []struct {
		name, from, to string
		code           int
		msg            string
	}{
		{"bad event date", `"date":"2026-11-07"`, `"date":"7 Nov"`, http.StatusBadRequest, "invalid event.date"},
		{"event outside trip", `"date":"2026-11-07"`, `"date":"2026-11-09"`, http.StatusUnprocessableEntity, "within the trip dates"},
		{"unknown need", `"kids_playground"]`, `"free_text"]`, http.StatusUnprocessableEntity, "need"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, fr := newTestHandler(t, 5, 0)
			body := strings.Replace(eventBody, tt.from, tt.to, 1)
			_, err := do(t, h.Generate, http.MethodPost, reqOpts{body: body, user: testUser})
			he := wantHTTPErr(t, err, tt.code)
			if msg := fmt.Sprint(he.Message); !strings.Contains(msg, tt.msg) {
				t.Errorf("message = %v, want %q", he.Message, tt.msg)
			}
			if uc.genCalls != 0 || fr.used(testUser) != 0 {
				t.Error("invalid event input must not reach the usecase or use quota")
			}
		})
	}
}

func TestHandlerGenerate_QuotaExceeded_429(t *testing.T) {
	h, uc, fr := newTestHandler(t, 3, 3)
	_, err := do(t, h.Generate, http.MethodPost, reqOpts{
		body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: testUser,
	})
	he := wantHTTPErr(t, err, http.StatusTooManyRequests)
	if errCode(he) != "DAILY_QUOTA_EXCEEDED" {
		t.Errorf("message = %#v", he.Message)
	}
	if uc.genCalls != 0 {
		t.Error("usecase must not be called when quota is exhausted")
	}
	if got := fr.used(testUser); got != 3 {
		t.Errorf("quota used = %d, want 3 (rejected call must not count)", got)
	}
}

func TestHandlerGenerate_QuotaDisabled(t *testing.T) {
	h, uc, _ := newTestHandler(t, 5, 0)
	h.WithQuota(quota.NewChecker(nil, nil))
	rec, err := do(t, h.Generate, http.MethodPost, reqOpts{
		body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: testUser,
	})
	if err != nil || rec.Code != http.StatusOK || uc.genCalls != 1 {
		t.Fatalf("err=%v status=%d calls=%d", err, rec.Code, uc.genCalls)
	}
}

func TestHandlerGenerate_UsecaseErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
		wantUsed   int
	}{
		{"invalid input", fmt.Errorf("%w: trip too long", ErrInvalidInput), http.StatusUnprocessableEntity, "INVALID_INPUT", 0},
		{"invalid prompt", fmt.Errorf("%w: not a trip", ErrInvalidPrompt), http.StatusUnprocessableEntity, "INVALID_PROMPT", 1},
		{"llm unavailable refunds", fmt.Errorf("%w: timeout", ErrLLMUnavailable), http.StatusServiceUnavailable, "LLM_UNAVAILABLE", 0},
		{"forbidden refunds", apperr.ErrForbidden, http.StatusForbidden, "", 0},
		{"unknown refunds", errors.New("parse llm response"), http.StatusInternalServerError, "", 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, fr := newTestHandler(t, 5, 0)
			uc.draftErr = tt.err
			_, err := do(t, h.Generate, http.MethodPost, reqOpts{
				body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: testUser,
			})
			he := wantHTTPErr(t, err, tt.wantStatus)
			if tt.wantCode != "" && errCode(he) != tt.wantCode {
				t.Errorf("code = %v, want %s", errCode(he), tt.wantCode)
			}
			if got := fr.used(testUser); got != tt.wantUsed {
				t.Errorf("quota used = %d, want %d", got, tt.wantUsed)
			}
		})
	}
}

func TestHandlerGenerate_InvalidInputMessageIsSurfaced(t *testing.T) {
	h, uc, _ := newTestHandler(t, 5, 0)
	uc.draftErr = fmt.Errorf("%w: something the usecase rejects", ErrInvalidInput)
	_, err := do(t, h.Generate, http.MethodPost, reqOpts{
		body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: testUser,
	})
	he := wantHTTPErr(t, err, http.StatusUnprocessableEntity)
	m, _ := he.Message.(map[string]any)
	if msg, _ := m["message"].(string); !strings.Contains(msg, "something the usecase rejects") {
		t.Errorf("message = %v", he.Message)
	}
}

// ---------- GenerateDayPreview ----------

func dayParams() map[string]string { return map[string]string{"trip_id": "t1", "day_id": "d1"} }

func TestHandlerDayPreview_Validation(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		params     map[string]string
		wantStatus int
	}{
		{"malformed json", `{"instruction":`, dayParams(), http.StatusBadRequest},
		{"empty instruction", `{"instruction":""}`, dayParams(), http.StatusUnprocessableEntity},
		{"whitespace instruction", `{"instruction":"   "}`, dayParams(), http.StatusUnprocessableEntity},
		{"html-only instruction", `{"instruction":"<b></b>"}`, dayParams(), http.StatusUnprocessableEntity},
		{"no letters", `{"instruction":"12345 !!!"}`, dayParams(), http.StatusUnprocessableEntity},
		{"too long", `{"instruction":"` + strings.Repeat("a", MaxDayInstructionLen+1) + `"}`, dayParams(), http.StatusUnprocessableEntity},
		{"missing day id", `{"instruction":"food tour"}`, map[string]string{"trip_id": "t1", "day_id": ""}, http.StatusUnprocessableEntity},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, fr := newTestHandler(t, 5, 0)
			_, err := do(t, h.GenerateDayPreview, http.MethodPost, reqOpts{body: tt.body, user: testUser, params: tt.params})
			he := wantHTTPErr(t, err, tt.wantStatus)
			if tt.wantStatus == http.StatusUnprocessableEntity && errCode(he) != "INVALID_INPUT" {
				t.Errorf("code = %v, want INVALID_INPUT", errCode(he))
			}
			if uc.prevCalls != 0 {
				t.Error("usecase must not be called on invalid input")
			}
			if got := fr.used(testUser); got != 0 {
				t.Errorf("invalid input consumed quota: used = %d", got)
			}
		})
	}
}

func TestHandlerDayPreview_Success(t *testing.T) {
	h, uc, fr := newTestHandler(t, 5, 0)
	rec, err := do(t, h.GenerateDayPreview, http.MethodPost, reqOpts{
		body: `{"instruction":"  <i>food</i> tour  "}`, user: testUser, params: dayParams(),
	})
	if err != nil {
		t.Fatalf("GenerateDayPreview: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	resp := decodeBody(t, rec)
	acts, _ := resp["activities"].([]any)
	if resp["theme"] != "Food" || len(acts) != 1 {
		t.Errorf("body = %v", resp)
	}
	want := GenerateDayInput{TripID: "t1", DayID: "d1", Instruction: "food tour"}
	if uc.prevIn != want {
		t.Errorf("input = %+v, want %+v", uc.prevIn, want)
	}
	if got := fr.used(testUser); got != 1 {
		t.Errorf("quota used = %d, want 1", got)
	}
}

func TestHandlerDayPreview_QuotaExceeded_429(t *testing.T) {
	h, uc, _ := newTestHandler(t, 1, 1)
	_, err := do(t, h.GenerateDayPreview, http.MethodPost, reqOpts{
		body: `{"instruction":"food tour"}`, user: testUser, params: dayParams(),
	})
	he := wantHTTPErr(t, err, http.StatusTooManyRequests)
	if errCode(he) != "DAILY_QUOTA_EXCEEDED" {
		t.Errorf("message = %#v", he.Message)
	}
	if uc.prevCalls != 0 {
		t.Error("usecase must not be called when quota is exhausted")
	}
}

func TestHandlerDayPreview_UsecaseErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantUsed   int
	}{
		{"day not found", ErrDayNotFound, http.StatusNotFound, 0},
		{"forbidden", fmt.Errorf("wrap: %w", apperr.ErrForbidden), http.StatusForbidden, 0},
		{"day full", fmt.Errorf("%w: day already has 6 activities", ErrInvalidInput), http.StatusUnprocessableEntity, 0},
		{"llm unavailable refunds", fmt.Errorf("%w: 502", ErrLLMUnavailable), http.StatusServiceUnavailable, 0},
		{"internal", errors.New("provider missing"), http.StatusInternalServerError, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, fr := newTestHandler(t, 5, 0)
			uc.prevErr = tt.err
			_, err := do(t, h.GenerateDayPreview, http.MethodPost, reqOpts{
				body: `{"instruction":"food tour"}`, user: testUser, params: dayParams(),
			})
			wantHTTPErr(t, err, tt.wantStatus)
			if got := fr.used(testUser); got != tt.wantUsed {
				t.Errorf("quota used = %d, want %d", got, tt.wantUsed)
			}
		})
	}
}

// ---------- CreateFromDraft ----------

func TestHandlerCreateFromDraft_Validation(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		wantMsg string
	}{
		{"malformed json", `{`, "invalid body"},
		{"missing start", `{"end_date":"2026-11-02"}`, "invalid start_date (expect YYYY-MM-DD)"},
		{"bad end", `{"start_date":"2026-11-01","end_date":"tomorrow"}`, "invalid end_date (expect YYYY-MM-DD)"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, _ := newTestHandler(t, 5, 0)
			_, err := do(t, h.CreateFromDraft, http.MethodPost, reqOpts{body: tt.body, user: testUser})
			he := wantHTTPErr(t, err, http.StatusBadRequest)
			if he.Message != tt.wantMsg {
				t.Errorf("message = %v, want %q", he.Message, tt.wantMsg)
			}
			if uc.createCalls != 0 {
				t.Error("usecase must not be called on invalid input")
			}
		})
	}
}

func TestHandlerCreateFromDraft_Success(t *testing.T) {
	h, uc, fr := newTestHandler(t, 5, 0)
	body := `{"start_date":"2026-11-01","end_date":"2026-11-02","cover_image_url":"https://img/x.jpg",` +
		`"description":"d","draft":{"title":"T","days":[{"day_number":1,"activities":[]}]}}`
	rec, err := do(t, h.CreateFromDraft, http.MethodPost, reqOpts{body: body, user: testUser})
	if err != nil {
		t.Fatalf("CreateFromDraft: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", rec.Code)
	}
	if resp := decodeBody(t, rec); resp["trip_id"] != "trip-123" {
		t.Errorf("body = %v", resp)
	}
	want := []string{"2026-11-01", "2026-11-02", "https://img/x.jpg", "d"}
	if strings.Join(uc.createArgs, "|") != strings.Join(want, "|") {
		t.Errorf("args = %v, want %v", uc.createArgs, want)
	}
	if got := fr.used(testUser); got != 0 {
		t.Errorf("persisting a draft must not consume AI quota: used = %d", got)
	}
}

func TestHandlerCreateFromDraft_ErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{"empty draft", fmt.Errorf("%w: draft has no days", ErrInvalidInput), http.StatusUnprocessableEntity},
		{"forbidden", apperr.ErrForbidden, http.StatusForbidden},
		{"db failure", errors.New("tx failed"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, uc, _ := newTestHandler(t, 5, 0)
			uc.createErr = tt.err
			_, err := do(t, h.CreateFromDraft, http.MethodPost, reqOpts{
				body: `{"start_date":"2026-11-01","end_date":"2026-11-02","draft":{}}`, user: testUser,
			})
			wantHTTPErr(t, err, tt.wantStatus)
		})
	}
}

// ---------- GetQuota ----------

func TestHandlerGetQuota(t *testing.T) {
	t.Run("enabled", func(t *testing.T) {
		h, _, fr := newTestHandler(t, 10, 4)
		rec, err := do(t, h.GetQuota, http.MethodGet, reqOpts{user: testUser})
		if err != nil || rec.Code != http.StatusOK {
			t.Fatalf("err=%v status=%d", err, rec.Code)
		}
		resp := decodeBody(t, rec)
		if resp["used"] != float64(4) || resp["limit"] != float64(10) || resp["remaining"] != float64(6) {
			t.Errorf("body = %v", resp)
		}
		if s, _ := resp["resets_at"].(string); s == "" {
			t.Error("resets_at missing")
		}
		if got := fr.used(testUser); got != 4 {
			t.Errorf("GetQuota must not consume: used = %d", got)
		}
	})
	t.Run("over limit clamps remaining", func(t *testing.T) {
		h, _, _ := newTestHandler(t, 2, 5)
		rec, _ := do(t, h.GetQuota, http.MethodGet, reqOpts{user: testUser})
		if resp := decodeBody(t, rec); resp["remaining"] != float64(0) {
			t.Errorf("body = %v", resp)
		}
	})
	t.Run("disabled", func(t *testing.T) {
		h, _, _ := newTestHandler(t, 5, 0)
		h.WithQuota(quota.NewChecker(nil, nil))
		rec, err := do(t, h.GetQuota, http.MethodGet, reqOpts{user: testUser})
		if err != nil || rec.Code != http.StatusOK {
			t.Fatalf("err=%v status=%d", err, rec.Code)
		}
		if resp := decodeBody(t, rec); resp["disabled"] != true {
			t.Errorf("body = %v", resp)
		}
	})
}

// A daily quota of 0 means unlimited (it used to fall back to the default 10).
func TestHandlerGenerate_ZeroQuotaIsUnlimited(t *testing.T) {
	h, uc, _ := newTestHandler(t, 0, 50)
	if _, err := do(t, h.Generate, http.MethodPost, reqOpts{
		body: genBody("Tokyo", "", "2026-11-01", "2026-11-02"), user: testUser,
	}); err != nil {
		t.Fatalf("quota 0 must not limit: %v", err)
	}
	if uc.genCalls != 1 {
		t.Errorf("usecase calls = %d, want 1", uc.genCalls)
	}
}
