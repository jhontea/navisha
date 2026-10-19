package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestCSRF_SkipsBearerAuthorization(t *testing.T) {
	e := echo.New()
	mw := CSRF(".navisha.cloud")
	called := false
	handler := mw(func(c echo.Context) error {
		called = true
		return c.NoContent(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodPost, "https://api.navisha.cloud/api/v1/trips", nil)
	req.Host = "api.navisha.cloud"
	req.Header.Set(echo.HeaderAuthorization, "Bearer access-token")
	rec := httptest.NewRecorder()

	if err := handler(e.NewContext(req, rec)); err != nil {
		t.Fatalf("CSRF bearer request: %v", err)
	}
	if !called {
		t.Fatal("next handler was not called")
	}
	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", rec.Code)
	}
}

func TestCSRF_StillBlocksUnsafeCookieStyleRequest(t *testing.T) {
	e := echo.New()
	mw := CSRF(".navisha.cloud")
	handler := mw(func(c echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodPost, "https://api.navisha.cloud/api/v1/trips", nil)
	req.Host = "api.navisha.cloud"
	rec := httptest.NewRecorder()

	err := handler(e.NewContext(req, rec))
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusForbidden {
		t.Fatalf("err = %v, want 403", err)
	}
}

func TestCSRF_SafeRequestSetsLaxCookieOnlyWhenMissing(t *testing.T) {
	e := echo.New()
	handler := CSRF(".navisha.cloud")(func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "https://api.navisha.cloud/api/v1/trips", nil)
	rec := httptest.NewRecorder()
	if err := handler(e.NewContext(req, rec)); err != nil {
		t.Fatalf("first GET: %v", err)
	}
	cookies := rec.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != csrfCookieName || cookies[0].Value == "" {
		t.Fatalf("first GET should set exactly one csrf cookie, got %+v", cookies)
	}
	if cookies[0].SameSite != http.SameSiteLaxMode || !cookies[0].Secure || cookies[0].HttpOnly {
		t.Errorf("csrf cookie = %+v, want Lax, Secure, readable by JS", cookies[0])
	}

	req = httptest.NewRequest(http.MethodGet, "https://api.navisha.cloud/api/v1/trips", nil)
	req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: cookies[0].Value})
	rec = httptest.NewRecorder()
	if err := handler(e.NewContext(req, rec)); err != nil {
		t.Fatalf("second GET: %v", err)
	}
	if got := rec.Result().Cookies(); len(got) != 0 {
		t.Errorf("GET with an existing token should not set cookies, got %+v", got)
	}
}

func TestCSRF_ComparesCookieAndHeader(t *testing.T) {
	tests := []struct {
		name   string
		header string
		want   int
	}{
		{"matching header passes", "token-123", http.StatusNoContent},
		{"different header blocked", "token-124", http.StatusForbidden},
		{"prefix header blocked", "token-12", http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := echo.New()
			handler := CSRF(".navisha.cloud")(func(c echo.Context) error {
				return c.NoContent(http.StatusNoContent)
			})
			req := httptest.NewRequest(http.MethodPost, "https://api.navisha.cloud/api/v1/trips", nil)
			req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: "token-123"})
			req.Header.Set(csrfHeaderName, tt.header)
			rec := httptest.NewRecorder()

			err := handler(e.NewContext(req, rec))
			if tt.want == http.StatusNoContent {
				if err != nil || rec.Code != http.StatusNoContent {
					t.Fatalf("err = %v, status = %d, want 204", err, rec.Code)
				}
				return
			}
			httpErr, ok := err.(*echo.HTTPError)
			if !ok || httpErr.Code != tt.want {
				t.Fatalf("err = %v, want %d", err, tt.want)
			}
		})
	}
}
