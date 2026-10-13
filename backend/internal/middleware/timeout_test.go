package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

// deadlineFor routes a request through a real Echo router with the Timeout
// middleware and returns the deadline the handler saw.
func deadlineFor(t *testing.T, method, target string) time.Duration {
	t.Helper()

	e := echo.New()
	e.Use(Timeout(30*time.Second, map[string]time.Duration{
		"POST /api/v1/trips/:id/summary": 300 * time.Second,
	}))

	var got time.Duration
	h := func(c echo.Context) error {
		dl, ok := c.Request().Context().Deadline()
		if !ok {
			t.Fatal("no deadline set")
		}
		got = time.Until(dl)
		return c.NoContent(http.StatusOK)
	}
	api := e.Group("/api/v1")
	api.POST("/trips/:id/summary", h)
	api.GET("/trips/:id/summary", h)
	api.GET("/trips/:id/expenses/summary", h)

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(method, target, nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	return got
}

func TestTimeout_LLMRouteGetsLongDeadline(t *testing.T) {
	if d := deadlineFor(t, http.MethodPost, "/api/v1/trips/abc/summary"); d < 290*time.Second {
		t.Errorf("deadline = %v, want ~300s", d)
	}
}

func TestTimeout_OtherRoutesGetDefault(t *testing.T) {
	for _, tc := range []struct{ method, target string }{
		{http.MethodGet, "/api/v1/trips/abc/summary"},          // same path, different method
		{http.MethodGet, "/api/v1/trips/abc/expenses/summary"}, // cheap DB aggregate
	} {
		if d := deadlineFor(t, tc.method, tc.target); d > 31*time.Second || d < 25*time.Second {
			t.Errorf("%s %s deadline = %v, want ~30s", tc.method, tc.target, d)
		}
	}
}
