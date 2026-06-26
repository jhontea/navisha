// Package middleware provides HTTP middleware for the Navisha API.
package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/labstack/echo/v4"
)

const csrfCookieName = "csrf_token"
const csrfHeaderName = "X-CSRF-Token"
const csrfTokenLen = 32

// CSRF implements the Double Submit Cookie pattern for CSRF protection.
//
// On GET/HEAD/OPTIONS requests: sets a random csrf_token cookie (non-HTTP-only
// so JavaScript can read it and include it in the X-CSRF-Token header).
//
// On POST/PUT/DELETE/PATCH requests: compares the csrf_token cookie value with
// the X-CSRF-Token header. They must match. This works because an attacker on
// a different origin cannot read the cookie (Same-Origin Policy), so they
// cannot forge the header.
//
// Exempts OAuth callback routes (which are redirects from Google, not
// initiated by our frontend JS).
func CSRF() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip CSRF check for safe methods — just ensure cookie is set.
			if isSafeMethod(c.Request().Method) {
				ensureCSRFCookie(c)
				return next(c)
			}

			// Skip CSRF check for OAuth callback (redirect from Google).
			if isOAuthCallback(c.Request().URL.Path) {
				return next(c)
			}

			// Unsafe method: verify double-submit.
			cookie, err := c.Cookie(csrfCookieName)
			if err != nil || cookie.Value == "" {
				return echo.NewHTTPError(http.StatusForbidden, "csrf token missing")
			}
			header := c.Request().Header.Get(csrfHeaderName)
			if header == "" {
				return echo.NewHTTPError(http.StatusForbidden, "csrf header missing")
			}
			if cookie.Value != header {
				return echo.NewHTTPError(http.StatusForbidden, "csrf token mismatch")
			}

			return next(c)
		}
	}
}

func isSafeMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	}
	return false
}

func isOAuthCallback(path string) bool {
	// OAuth callbacks arrive as GET from Google, so they'd pass isSafeMethod.
	// But also skip POST/PUT/DELETE to auth endpoints in case OAuth providers
	// use different methods in the future.
	return len(path) >= 20 &&
		path[len(path)-17:] == "/auth/google/callback" ||
		path[len(path)-14:] == "/auth/callback"
}

func ensureCSRFCookie(c echo.Context) {
	_, err := c.Cookie(csrfCookieName)
	if err == nil {
		return // already set
	}
	token := generateCSRFToken()
	c.SetCookie(&http.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   86400, // 24 hours
		HttpOnly: false, // must be readable by JavaScript
		Secure:   c.Request().URL.Scheme == "https" || c.Request().Header.Get("X-Forwarded-Proto") == "https",
		SameSite: http.SameSiteStrictMode,
	})
}

func generateCSRFToken() string {
	b := make([]byte, csrfTokenLen)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
