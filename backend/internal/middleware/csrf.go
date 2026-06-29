// Package middleware provides HTTP middleware for the Navisha API.
package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

const csrfCookieName = "csrf_token"
const csrfHeaderName = "X-CSRF-Token"
const csrfTokenLen = 32

// CSRF implements the Double Submit Cookie pattern for CSRF protection.
//
// cookieDomain is the shared domain for the CSRF cookie (e.g. ".navisha.cloud").
// Without it, the cookie is scoped to the API subdomain only and the frontend
// JS cannot read it. Pass empty string for localhost (CSRF is skipped there).
//
// On GET/HEAD/OPTIONS requests: sets a random csrf_token cookie (non-HTTP-only
// so JavaScript can read it and include it in the X-CSRF-Token header).
//
// On POST/PUT/DELETE/PATCH requests: compares the csrf_token cookie value with
// the X-CSRF-Token header. They must match.
//
// Exempts OAuth callback routes (which are redirects from Google, not
// initiated by our frontend JS).
func CSRF(cookieDomain string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip CSRF on localhost — cross-port cookie access is blocked.
			if isLocalhost(c) || cookieDomain == "" {
				return next(c)
			}

			// Skip CSRF check for safe methods — just ensure cookie is set.
			if isSafeMethod(c.Request().Method) {
				ensureCSRFCookie(c, cookieDomain)
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

// isLocalhost returns true when the request comes from a localhost origin.
// CSRF double-submit can't work across different ports on localhost because
// the browser blocks cross-origin document.cookie access (localhost:3000
// cannot read cookies set by localhost:8090).
func isLocalhost(c echo.Context) bool {
	host := c.Request().Host
	if host == "" {
		return false
	}
	// Strip port if present.
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func isOAuthCallback(path string) bool {
	// OAuth callbacks arrive as GET from Google, so they'd pass isSafeMethod.
	// Using strings.HasSuffix is more readable and less error-prone than
	// manual length-and-slice arithmetic (which breaks if the constant is wrong).
	return strings.HasSuffix(path, "/auth/google/callback") ||
		strings.HasSuffix(path, "/auth/callback")
}

func ensureCSRFCookie(c echo.Context, cookieDomain string) {
	// Reuse existing token if present, generate new one if missing.
	token := ""
	if ck, err := c.Cookie(csrfCookieName); err == nil && ck.Value != "" {
		token = ck.Value
	} else {
		token = generateCSRFToken()
	}

	// Clear any old cookie that was set without Domain (scoped to api.* only).
	// Must match the Domain attribute of the cookie being cleared, otherwise
	// the browser keeps the old cookie and sends two cookies.
	clearDomain := cookieDomain
	if clearDomain == "" {
		clearDomain = c.Request().URL.Hostname()
	}
	c.SetCookie(&http.Cookie{
		Name:     csrfCookieName,
		Value:    "",
		Path:     "/",
		Domain:   clearDomain,
		MaxAge:   -1,
		HttpOnly: false,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	// Set with the shared Domain so frontend JS on navisha.cloud can read it.
	c.SetCookie(&http.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		Domain:   cookieDomain,
		MaxAge:   86400, // 24 hours
		HttpOnly: false, // must be readable by JavaScript
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
}

func generateCSRFToken() string {
	b := make([]byte, csrfTokenLen)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand should never fail on normal systems, but if it does,
		// fall back to a time-based fallback (less secure but better than a static token).
		for i := range b {
			b[i] = byte(time.Now().UnixNano() % 256)
		}
	}
	return base64.URLEncoding.EncodeToString(b)
}
