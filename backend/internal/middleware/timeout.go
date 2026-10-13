// Package middleware provides HTTP middleware for the Navisha API.
package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// Timeout returns middleware that sets a per-request deadline of d.
// Routes listed in overrides (keyed "METHOD /route/pattern", e.g.
// "POST /api/v1/trips/:id/summary") get their own deadline instead, so slow
// LLM endpoints can run long without letting every CRUD request hold a DB
// connection for minutes. Must be registered with e.Use (not e.Pre) so the
// matched route pattern is available via c.Path().
func Timeout(d time.Duration, overrides map[string]time.Duration) echo.MiddlewareFunc {
	if d <= 0 {
		d = 30 * time.Second
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			limit := d
			if o, ok := overrides[c.Request().Method+" "+c.Path()]; ok && o > 0 {
				limit = o
			}

			ctx, cancel := context.WithTimeout(c.Request().Context(), limit)
			defer cancel()

			c.SetRequest(c.Request().WithContext(ctx))

			err := next(c)

			if ctx.Err() == context.DeadlineExceeded {
				return echo.NewHTTPError(http.StatusGatewayTimeout, "request timeout")
			}
			return err
		}
	}
}
