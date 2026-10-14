package tripshare

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

const handlerSecret = "handler-secret"

// stubRepo is a configurable Repository for handler tests.
type stubRepo struct {
	createErr  error
	activeLink *Link
	activeErr  error
	revokeErr  error
	resolved   *PublicItinerary
	resolveErr error

	createTrip, createUser string
	createExpiry           time.Time
	revokeTrip, revokeUser string
	resolveID              string
}

func (s *stubRepo) Create(_ context.Context, tripID, userID string, expiresAt time.Time) (*Link, error) {
	s.createTrip, s.createUser, s.createExpiry = tripID, userID, expiresAt
	if s.createErr != nil {
		return nil, s.createErr
	}
	return &Link{ID: "link-1", TripID: tripID, CreatedBy: userID, ExpiresAt: expiresAt}, nil
}

func (s *stubRepo) FindActive(context.Context, string, string) (*Link, error) {
	return s.activeLink, s.activeErr
}

func (s *stubRepo) Revoke(_ context.Context, tripID, userID string) error {
	s.revokeTrip, s.revokeUser = tripID, userID
	return s.revokeErr
}

func (s *stubRepo) Resolve(_ context.Context, id string) (*PublicItinerary, error) {
	s.resolveID = id
	return s.resolved, s.resolveErr
}

var handlerNow = time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)

func newTestHandler(repo *stubRepo) (*Handler, *Usecase) {
	u := NewUsecase(repo, handlerSecret)
	u.now = func() time.Time { return handlerNow }
	return NewHandler(u), u
}

func newCtx(method, body string, names, values []string) (echo.Context, *httptest.ResponseRecorder) {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, "/", strings.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	} else {
		req = httptest.NewRequest(method, "/", nil)
	}
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.SetParamNames(names...)
	c.SetParamValues(values...)
	return c, rec
}

func authed(h func(echo.Context, string) error, c echo.Context, uid string) error {
	if uid != "" {
		c.Set(middleware.UserIDKey, uid)
	}
	return middleware.WithUser(h)(c)
}

func wantHTTPCode(t *testing.T, err error, want int) {
	t.Helper()
	var he *echo.HTTPError
	if !errors.As(err, &he) {
		t.Fatalf("err = %v, want *echo.HTTPError %d", err, want)
	}
	if he.Code != want {
		t.Fatalf("code = %d (%v), want %d", he.Code, he.Message, want)
	}
}

func TestHandler_AuthedRoutes_MissingUser_401(t *testing.T) {
	h, _ := newTestHandler(&stubRepo{})
	for name, fn := range map[string]func(echo.Context, string) error{
		"Create": h.Create, "GetActive": h.GetActive, "Revoke": h.Revoke,
	} {
		t.Run(name, func(t *testing.T) {
			c, _ := newCtx(http.MethodPost, `{"duration_days":7}`, []string{"id"}, []string{"trip-1"})
			wantHTTPCode(t, authed(fn, c, ""), http.StatusUnauthorized)
		})
	}
}

func TestHandler_Create(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		createErr error
		wantCode  int
		wantDays  int
	}{
		{"1 day", `{"duration_days":1}`, nil, http.StatusCreated, 1},
		{"3 days", `{"duration_days":3}`, nil, http.StatusCreated, 3},
		{"7 days", `{"duration_days":7}`, nil, http.StatusCreated, 7},
		{"14 days", `{"duration_days":14}`, nil, http.StatusCreated, 14},
		{"30 days", `{"duration_days":30}`, nil, http.StatusCreated, 30},
		{"bad json", `{"duration_days":`, nil, http.StatusBadRequest, 0},
		{"string duration", `{"duration_days":"7"}`, nil, http.StatusBadRequest, 0},
		{"missing duration", `{}`, nil, http.StatusBadRequest, 0},
		{"zero", `{"duration_days":0}`, nil, http.StatusBadRequest, 0},
		{"negative", `{"duration_days":-7}`, nil, http.StatusBadRequest, 0},
		{"unsupported 2", `{"duration_days":2}`, nil, http.StatusBadRequest, 0},
		{"too long 365", `{"duration_days":365}`, nil, http.StatusBadRequest, 0},
		{"trip not owned/not found", `{"duration_days":7}`, ErrNotFound, http.StatusNotFound, 0},
		{"repo failure", `{"duration_days":7}`, errors.New("db down"), 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &stubRepo{createErr: tt.createErr}
			h, u := newTestHandler(repo)
			c, rec := newCtx(http.MethodPost, tt.body, []string{"id"}, []string{"trip-1"})
			err := authed(h.Create, c, "user-1")
			switch {
			case tt.wantCode == 0:
				// Unmapped errors pass through untouched (Echo renders 500).
				if err == nil || !errors.Is(err, tt.createErr) {
					t.Fatalf("err = %v, want passthrough of %v", err, tt.createErr)
				}
				return
			case tt.wantCode != http.StatusCreated:
				wantHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if rec.Code != http.StatusCreated {
				t.Fatalf("status = %d", rec.Code)
			}
			var got LinkResult
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if want := "link-1." + u.signature("link-1"); got.Token != want {
				t.Errorf("token = %q, want %q", got.Token, want)
			}
			if want := handlerNow.Add(time.Duration(tt.wantDays) * 24 * time.Hour); !got.ExpiresAt.Equal(want) {
				t.Errorf("expires_at = %v, want %v", got.ExpiresAt, want)
			}
			if repo.createTrip != "trip-1" || repo.createUser != "user-1" {
				t.Errorf("repo got trip=%q user=%q", repo.createTrip, repo.createUser)
			}
		})
	}
}

func TestHandler_GetActive(t *testing.T) {
	exp := handlerNow.Add(72 * time.Hour)
	tests := []struct {
		name     string
		link     *Link
		err      error
		wantCode int
	}{
		{"active", &Link{ID: "abc", ExpiresAt: exp}, nil, http.StatusOK},
		{"none", nil, ErrNotFound, http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, u := newTestHandler(&stubRepo{activeLink: tt.link, activeErr: tt.err})
			c, rec := newCtx(http.MethodGet, "", []string{"id"}, []string{"trip-1"})
			err := authed(h.GetActive, c, "user-1")
			if tt.wantCode != http.StatusOK {
				wantHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			var got map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got["token"] != "abc."+u.signature("abc") {
				t.Errorf("token = %v", got["token"])
			}
			if got["expires_at"] != exp.Format(time.RFC3339) {
				t.Errorf("expires_at = %v", got["expires_at"])
			}
		})
	}
}

func TestHandler_Revoke(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantCode int
	}{
		{"revoked", nil, http.StatusNoContent},
		{"nothing to revoke", ErrNotFound, http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &stubRepo{revokeErr: tt.err}
			h, _ := newTestHandler(repo)
			c, rec := newCtx(http.MethodDelete, "", []string{"id"}, []string{"trip-9"})
			err := authed(h.Revoke, c, "user-1")
			if tt.wantCode != http.StatusNoContent {
				wantHTTPCode(t, err, tt.wantCode)
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if rec.Code != http.StatusNoContent {
				t.Errorf("status = %d", rec.Code)
			}
			if repo.revokeTrip != "trip-9" || repo.revokeUser != "user-1" {
				t.Errorf("repo got trip=%q user=%q", repo.revokeTrip, repo.revokeUser)
			}
		})
	}
}

func TestHandler_Resolve(t *testing.T) {
	signer := NewUsecase(nil, handlerSecret)
	valid := "link-1." + signer.signature("link-1")
	otherSecret := "link-1." + NewUsecase(nil, "other").signature("link-1")
	itin := &PublicItinerary{Title: "Japan", StartDate: "2026-11-01", Days: []PublicDay{{ID: "d1", DayNumber: 1}}}

	tests := []struct {
		name       string
		token      string
		resolved   *PublicItinerary
		resolveErr error
		wantCode   int
	}{
		{"valid", valid, itin, nil, http.StatusOK},
		{"empty token", "", nil, nil, http.StatusNotFound},
		{"no dot", "link-1", nil, nil, http.StatusNotFound},
		{"empty id", "." + signer.signature(""), nil, nil, http.StatusNotFound},
		{"too many parts", valid + ".x", nil, nil, http.StatusNotFound},
		{"tampered signature", "link-1.AAAA", nil, nil, http.StatusNotFound},
		{"signed with other secret", otherSecret, nil, nil, http.StatusNotFound},
		{"id swapped", "link-2." + signer.signature("link-1"), nil, nil, http.StatusNotFound},
		{"expired", valid, nil, ErrExpired, http.StatusGone},
		{"deleted link", valid, nil, ErrNotFound, http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &stubRepo{resolved: tt.resolved, resolveErr: tt.resolveErr}
			h, _ := newTestHandler(repo)
			c, rec := newCtx(http.MethodGet, "", []string{"token"}, []string{tt.token})
			err := h.Resolve(c)

			// Privacy headers are set on every response, success or not.
			if got := rec.Header().Get("X-Robots-Tag"); got != "noindex, nofollow" {
				t.Errorf("X-Robots-Tag = %q", got)
			}
			if got := rec.Header().Get("Referrer-Policy"); got != "no-referrer" {
				t.Errorf("Referrer-Policy = %q", got)
			}

			if tt.wantCode != http.StatusOK {
				wantHTTPCode(t, err, tt.wantCode)
				if tt.resolveErr == nil && repo.resolveID != "" {
					t.Errorf("repo hit with invalid token (id %q)", repo.resolveID)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if repo.resolveID != "link-1" {
				t.Errorf("resolve id = %q", repo.resolveID)
			}
			var got map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if got["title"] != "Japan" || got["start_date"] != "2026-11-01" {
				t.Errorf("body = %v", got)
			}
			if days, _ := got["days"].([]any); len(days) != 1 {
				t.Errorf("days = %v", got["days"])
			}
		})
	}
}
