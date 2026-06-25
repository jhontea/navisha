// Package middleware provides HTTP middleware for the Navisha API.
// Phase 3D / Loop 6: Request timeout middleware.
package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// Timeout returns middleware that sets a per-request deadline. Requests that
// exceed the duration are cancelled, preventing slow DB queries or external
// API calls from exhausting server resources. The default is 30s.
func Timeout(d time.Duration) echo.MiddlewareFunc {
	if d <= 0 {
		d = 30 * time.Second
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx, cancel := context.WithTimeout(c.Request().Context(), d)
			defer cancel()

			c.SetRequest(c.Request().WithContext(ctx))

			err := next(c)

			// If the context deadline was exceeded, return a proper 504.
			if ctx.Err() == context.DeadlineExceeded {
				return echo.NewHTTPError(http.StatusGatewayTimeout, "request timeout")
			}
			return err
		}
	}
}
