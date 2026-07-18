// Package middleware provides HTTP middleware for the Navisha API.
package middleware

import (
	"github.com/labstack/echo/v4"
)

// SecurityHeaders adds HTTP security headers to every API response.
// Next.js also sets these for the frontend, but the API should be self-protecting
// in case it is accessed directly (curl, API clients, etc.).
func SecurityHeaders() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			h := c.Response().Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			h.Set("X-Permitted-Cross-Domain-Policies", "none")
			h.Set("Cross-Origin-Resource-Policy", "same-origin")
			// Legacy XSS filter for older browsers (defense-in-depth).
			h.Set("X-XSS-Protection", "1; mode=block")
			// Loop 18: expose request ID in response so clients can reference
			// it in bug reports. Echo's RequestID middleware stores it on the
			// context; this header mirrors it to the client.
			if rid := c.Response().Header().Get(echo.HeaderXRequestID); rid == "" {
				rid = c.Request().Header.Get(echo.HeaderXRequestID)
				if rid != "" {
					h.Set(echo.HeaderXRequestID, rid)
				}
			}
			return next(c)
		}
	}
}

// NoCache sets Cache-Control: no-store on responses. Use on auth endpoints
// (token refresh, logout, me) to prevent browsers from caching credentials.
func NoCache() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			c.Response().Header().Set("Pragma", "no-cache")
			return next(c)
		}
	}
}
