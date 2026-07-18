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
