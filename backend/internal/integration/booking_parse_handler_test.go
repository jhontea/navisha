package integration

import (
	"context"
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
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/jhontea/navisha/backend/pkg/llm"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

const bpUser = "u1"

type fakeBPTrips struct{ err error }

func (f fakeBPTrips) Get(_ context.Context, _, tripID string) (*trip.Trip, []trip.Day, error) {
	if f.err != nil {
		return nil, nil, f.err
	}
	return &trip.Trip{ID: tripID, Title: "Bali"}, nil, nil
}

type fakeBPLLM struct {
	resp  string
	err   error
	calls int
}

func (f *fakeBPLLM) ChatCompletion(_ context.Context, _ llm.ChatRequest) (string, error) {
	f.calls++
	return f.resp, f.err
}

type bpHarness struct {
	llm *fakeBPLLM
	mr  *miniredis.Miniredis
	h   *BookingParseHandler
}

func newBPHarness(t *testing.T, trips fakeBPTrips, limit, used int) *bpHarness {
	t.Helper()
	mr := miniredis.RunT(t)
	_ = mr.Set("app:config:autogen_daily_quota", strconv.Itoa(limit))
	_ = mr.Set(bpQuotaKey(), strconv.Itoa(used))
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	f := &fakeBPLLM{resp: `{"bookings":[]}`}
	return &bpHarness{llm: f, mr: mr, h: NewBookingParseHandler(trips, f, "m").WithQuota(quota.NewChecker(rdb, nil))}
}

// bpQuotaKey matches quota.userKey: per user per UTC day.
func bpQuotaKey() string {
	return "ratelimit:autogen:daily:" + bpUser + ":" + time.Now().UTC().Format("2006-01-02")
}

func (hs *bpHarness) used() int {
	v, _ := hs.mr.Get(bpQuotaKey())
	n, _ := strconv.Atoi(v)
	return n
}

func (hs *bpHarness) call(t *testing.T, text string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"text": text})
	req := httptest.NewRequest(http.MethodPost, "/trips/t1/bookings/parse", strings.NewReader(string(body)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("t1")
	c.Set(middleware.UserIDKey, bpUser)
	return rec, middleware.WithUser(hs.h.Parse)(c)
}

func bpWantStatus(t *testing.T, err error, code int) {
	t.Helper()
	var he *echo.HTTPError
	if !errors.As(err, &he) || he.Code != code {
		t.Fatalf("err = %v, want HTTP %d", err, code)
	}
}

func TestBookingParseHandler_BadTextNoAINoQuota(t *testing.T) {
	for name, text := range map[string]string{
		"empty":    "  \n ",
		"too long": strings.Repeat("é", BookingParseMaxChars+1),
	} {
		t.Run(name, func(t *testing.T) {
			hs := newBPHarness(t, fakeBPTrips{}, 5, 0)
			_, err := hs.call(t, text)
			bpWantStatus(t, err, http.StatusBadRequest)
			if hs.llm.calls != 0 || hs.used() != 0 {
				t.Errorf("llm calls = %d, quota used = %d, want 0/0", hs.llm.calls, hs.used())
			}
		})
	}
	// Exactly the limit is accepted.
	hs := newBPHarness(t, fakeBPTrips{}, 5, 0)
	if _, err := hs.call(t, strings.Repeat("é", BookingParseMaxChars)); err != nil {
		t.Fatalf("limit text: %v", err)
	}
}

func TestBookingParseHandler_TripErrorsBeforeAI(t *testing.T) {
	for code, tripErr := range map[int]error{
		http.StatusNotFound:  trip.ErrNotFound,
		http.StatusForbidden: apperr.ErrForbidden,
	} {
		hs := newBPHarness(t, fakeBPTrips{err: tripErr}, 5, 0)
		_, err := hs.call(t, "some text")
		bpWantStatus(t, err, code)
		if hs.llm.calls != 0 || hs.used() != 0 {
			t.Errorf("%d: llm calls = %d, quota used = %d", code, hs.llm.calls, hs.used())
		}
	}
}

func TestBookingParseHandler_QuotaExceeded429(t *testing.T) {
	hs := newBPHarness(t, fakeBPTrips{}, 2, 2)
	_, err := hs.call(t, "some text")
	bpWantStatus(t, err, http.StatusTooManyRequests)
	if hs.llm.calls != 0 {
		t.Errorf("llm called %d times", hs.llm.calls)
	}
}

func TestBookingParseHandler_LLMFailureRefunds503(t *testing.T) {
	for name, f := range map[string]fakeBPLLM{
		"error":       {err: errors.New("timeout")},
		"broken json": {resp: `{"bookings":[`},
	} {
		t.Run(name, func(t *testing.T) {
			hs := newBPHarness(t, fakeBPTrips{}, 5, 1)
			*hs.llm = f
			_, err := hs.call(t, "some text")
			bpWantStatus(t, err, http.StatusServiceUnavailable)
			if hs.used() != 1 {
				t.Errorf("quota used = %d, want 1 (refunded)", hs.used())
			}
		})
	}
}

func TestBookingParseHandler_OKConsumesQuota(t *testing.T) {
	withBookingCurrencies(t)
	hs := newBPHarness(t, fakeBPTrips{}, 5, 0)
	rec, err := hs.call(t, "Not a booking")
	if err != nil || rec.Code != http.StatusOK {
		t.Fatalf("err = %v code = %d", err, rec.Code)
	}
	if strings.TrimSpace(rec.Body.String()) != `{"bookings":[]}` {
		t.Errorf("body = %s", rec.Body.String())
	}
	if hs.used() != 1 {
		t.Errorf("quota used = %d, want 1", hs.used())
	}

	hs.llm.resp = `{"bookings":[{"kind":"transport","type":"train","from_location":"Gambir","to_location":"Yogyakarta","departure_local":"2026-11-13T08:00","arrival_local":null,"cost_amount":650000,"cost_currency":"IDR"},{"kind":"stay","name":"Hotel","check_in":"2026-11-13","check_out":"2026-11-15","cost_amount":null,"cost_currency":null}]}`
	rec, err = hs.call(t, "two bookings")
	if err != nil {
		t.Fatal(err)
	}
	var got struct {
		Bookings []map[string]any `json:"bookings"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if len(got.Bookings) != 2 {
		t.Fatalf("bookings = %s", rec.Body.String())
	}
	tr := got.Bookings[0]["transport"].(map[string]any)
	if tr["departure_datetime"] != "2026-11-13T08:00:00Z" || tr["arrival_datetime"] != nil || got.Bookings[0]["cost"] == nil {
		t.Errorf("transport = %v", got.Bookings[0])
	}
	if got.Bookings[1]["stay"] == nil || got.Bookings[1]["cost"] != nil {
		t.Errorf("stay = %v", got.Bookings[1])
	}
}
