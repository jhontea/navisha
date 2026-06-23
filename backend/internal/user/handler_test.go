package user

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

const testFrontendURL = "http://localhost:3000"
const testCookieDomain = "" // empty for localhost tests

func newHandler(mu *mockUsecase) *Handler {
	return NewHandler(mu, testFrontendURL, testCookieDomain)
}

// ---------- GoogleRedirect ----------

func TestGoogleRedirect_SetsStateCookieAndRedirects(t *testing.T) {
	mu := &mockUsecase{authURL: "https://accounts.google.com/x"}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodGet, "/auth/google", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	if err := h.GoogleRedirect(c); err != nil {
		t.Fatalf("GoogleRedirect: %v", err)
	}

	if rec.Code != http.StatusTemporaryRedirect {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusTemporaryRedirect)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "https://accounts.google.com/x?state=") {
		t.Errorf("Location = %q, want google URL with state", loc)
	}

	cookie := findCookie(rec.Result().Cookies(), "oauth_state")
	if cookie == nil {
		t.Fatal("oauth_state cookie not set")
	}
	if !cookie.HttpOnly {
		t.Error("oauth_state cookie should be HttpOnly")
	}
	if cookie.MaxAge != 300 {
		t.Errorf("oauth_state MaxAge = %d, want 300", cookie.MaxAge)
	}
	// State value should also appear in redirect URL.
	if !strings.Contains(loc, cookie.Value) {
		t.Error("state cookie value not present in redirect URL")
	}
}

// ---------- GoogleCallback ----------

func TestGoogleCallback_Success(t *testing.T) {
	mu := &mockUsecase{
		loginUser:   &User{ID: "u1"},
		loginTokens: &Tokens{AccessToken: "a", RefreshToken: "r"},
	}
	h := newHandler(mu)

	req := httptest.NewRequest(
		http.MethodGet,
		"/auth/google/callback?state=xyz&code=auth-code",
		nil,
	)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "xyz"})
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	if err := h.GoogleCallback(c); err != nil {
		t.Fatalf("GoogleCallback: %v", err)
	}

	if rec.Code != http.StatusTemporaryRedirect {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusTemporaryRedirect)
	}
	wantLoc := testFrontendURL + "/auth/callback"
	if rec.Header().Get("Location") != wantLoc {
		t.Errorf("Location = %q, want %q", rec.Header().Get("Location"), wantLoc)
	}
	if mu.loginCalls != 1 {
		t.Errorf("loginCalls = %d, want 1", mu.loginCalls)
	}
	if mu.loginCode != "auth-code" {
		t.Errorf("loginCode = %q, want auth-code", mu.loginCode)
	}

	cookies := rec.Result().Cookies()
	if access := findCookie(cookies, "access_token"); access == nil || access.Value != "a" {
		t.Errorf("access_token cookie = %+v, want value 'a'", access)
	}
	if refresh := findCookie(cookies, "refresh_token"); refresh == nil || refresh.Value != "r" {
		t.Errorf("refresh_token cookie = %+v, want value 'r'", refresh)
	}
	// State cookie should be cleared (MaxAge < 0).
	if state := findCookie(cookies, "oauth_state"); state == nil || state.MaxAge >= 0 {
		t.Errorf("oauth_state should be cleared, got %+v", state)
	}
}

func TestGoogleCallback_InvalidState(t *testing.T) {
	tests := []struct {
		name        string
		cookieValue string
		queryState  string
	}{
		{"missing cookie", "", "xyz"},
		{"mismatch", "abc", "xyz"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mu := &mockUsecase{}
			h := newHandler(mu)

			req := httptest.NewRequest(
				http.MethodGet,
				"/auth/google/callback?state="+tc.queryState+"&code=c",
				nil,
			)
			if tc.cookieValue != "" {
				req.AddCookie(&http.Cookie{Name: "oauth_state", Value: tc.cookieValue})
			}
			rec := httptest.NewRecorder()
			c := echo.New().NewContext(req, rec)

			err := h.GoogleCallback(c)
			httpErr, ok := err.(*echo.HTTPError)
			if !ok {
				t.Fatalf("err = %v, want *echo.HTTPError", err)
			}
			if httpErr.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400", httpErr.Code)
			}
			if mu.loginCalls != 0 {
				t.Errorf("loginCalls = %d, want 0 (state check failed first)", mu.loginCalls)
			}
		})
	}
}

func TestGoogleCallback_MissingCode(t *testing.T) {
	mu := &mockUsecase{}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?state=xyz", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "xyz"})
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	err := h.GoogleCallback(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusBadRequest {
		t.Fatalf("err = %v, want 400", err)
	}
	if mu.loginCalls != 0 {
		t.Error("loginCalls should be 0 without code")
	}
}

func TestGoogleCallback_LoginFails(t *testing.T) {
	mu := &mockUsecase{loginErr: errors.New("oauth boom")}
	h := newHandler(mu)

	req := httptest.NewRequest(
		http.MethodGet,
		"/auth/google/callback?state=xyz&code=c",
		nil,
	)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "xyz"})
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	err := h.GoogleCallback(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusInternalServerError {
		t.Fatalf("err = %v, want 500", err)
	}
}

// ---------- Logout ----------

func TestLogout_ClearsCookies(t *testing.T) {
	h := newHandler(&mockUsecase{})

	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	if err := h.Logout(c); err != nil {
		t.Fatalf("Logout: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}

	cookies := rec.Result().Cookies()
	for _, name := range []string{"access_token", "refresh_token"} {
		c := findCookie(cookies, name)
		if c == nil {
			t.Errorf("%s cookie not set on logout", name)
			continue
		}
		if c.MaxAge >= 0 {
			t.Errorf("%s cookie MaxAge = %d, want < 0", name, c.MaxAge)
		}
	}
}

// ---------- Refresh ----------

func TestRefresh_Success(t *testing.T) {
	mu := &mockUsecase{refreshResult: &Tokens{AccessToken: "a2", RefreshToken: "r2"}}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: "old-r"})
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	if err := h.Refresh(c); err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if mu.refreshToken != "old-r" {
		t.Errorf("refreshToken passed = %q, want 'old-r'", mu.refreshToken)
	}
	cookies := rec.Result().Cookies()
	if a := findCookie(cookies, "access_token"); a == nil || a.Value != "a2" {
		t.Errorf("access_token = %+v, want value a2", a)
	}
	if r := findCookie(cookies, "refresh_token"); r == nil || r.Value != "r2" {
		t.Errorf("refresh_token = %+v, want value r2", r)
	}
}

func TestRefresh_MissingCookie(t *testing.T) {
	h := newHandler(&mockUsecase{})

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	err := h.Refresh(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusUnauthorized {
		t.Fatalf("err = %v, want 401", err)
	}
}

func TestRefresh_InvalidToken(t *testing.T) {
	mu := &mockUsecase{refreshErr: errors.New("invalid")}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: "bad"})
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)

	err := h.Refresh(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusUnauthorized {
		t.Fatalf("err = %v, want 401", err)
	}
	// Invalid refresh should clear cookies so client knows to re-login.
	cookies := rec.Result().Cookies()
	for _, name := range []string{"access_token", "refresh_token"} {
		c := findCookie(cookies, name)
		if c == nil || c.MaxAge >= 0 {
			t.Errorf("%s should be cleared, got %+v", name, c)
		}
	}
}

// ---------- Me ----------

func TestMe_Success(t *testing.T) {
	mu := &mockUsecase{
		meUser: &User{ID: "u1", Email: "a@b.com", Name: "Ahmad", AvatarURL: "https://pic"},
	}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set(middleware.UserIDKey, "u1")

	if err := h.Me(c); err != nil {
		t.Fatalf("Me: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if mu.meID != "u1" {
		t.Errorf("usecase Me called with %q, want u1", mu.meID)
	}

	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body["id"] != "u1" || body["email"] != "a@b.com" || body["name"] != "Ahmad" {
		t.Errorf("body = %+v", body)
	}
}

func TestMe_NotFound(t *testing.T) {
	mu := &mockUsecase{meErr: ErrNotFound}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set(middleware.UserIDKey, "missing")

	err := h.Me(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusNotFound {
		t.Fatalf("err = %v, want 404", err)
	}
}

func TestMe_OtherError(t *testing.T) {
	mu := &mockUsecase{meErr: errors.New("db down")}
	h := newHandler(mu)

	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.Set(middleware.UserIDKey, "u1")

	err := h.Me(c)
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusInternalServerError {
		t.Fatalf("err = %v, want 500", err)
	}
}

// ---------- helpers ----------

func findCookie(cookies []*http.Cookie, name string) *http.Cookie {
	for _, c := range cookies {
		if c.Name == name {
			return c
		}
	}
	return nil
}
