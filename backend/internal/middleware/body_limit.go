// Package middleware provides HTTP middleware for the Navisha API.
// Loop 3: Request body size limiter to prevent memory exhaustion.
package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// BodyLimit returns middleware that limits the request body size.
// Requests exceeding limit receive a 413 Payload Too Large response.
func BodyLimit(maxBytes int64) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Request().Body = http.MaxBytesReader(
				c.Response(),
				c.Request().Body,
				maxBytes,
			)
			return next(c)
		}
	}
}
