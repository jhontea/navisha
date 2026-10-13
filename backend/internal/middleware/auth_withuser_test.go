package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestWithUser(t *testing.T) {
	e := echo.New()
	newCtx := func() echo.Context {
		return e.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), httptest.NewRecorder())
	}

	var got string
	h := WithUser(func(_ echo.Context, userID string) error {
		got = userID
		return nil
	})

	c := newCtx()
	c.Set(UserIDKey, "user-1")
	if err := h(c); err != nil || got != "user-1" {
		t.Fatalf("with user: err=%v userID=%q", err, got)
	}

	got = ""
	err := h(newCtx())
	var he *echo.HTTPError
	if !errors.As(err, &he) || he.Code != http.StatusUnauthorized {
		t.Fatalf("without user: want 401, got %v", err)
	}
	if got != "" {
		t.Fatal("handler must not run without a user")
	}
}
