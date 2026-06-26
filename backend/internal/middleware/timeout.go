// Package middleware provides HTTP middleware for the Navisha API.
package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// Timeout returns middleware that sets a per-request deadline.
// Default 300s matches the LLM timeout for slow AI calls.
func Timeout(d time.Duration) echo.MiddlewareFunc {
	if d <= 0 {
		d = 300 * time.Second
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx, cancel := context.WithTimeout(c.Request().Context(), d)
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
