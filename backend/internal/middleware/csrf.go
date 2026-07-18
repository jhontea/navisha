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
// API clients using Authorization: Bearer are skipped because CSRF
// protects automatically-sent browser cookies, not explicit auth headers.
func CSRF(cookieDomain string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if isLocalhost(c) || cookieDomain == "" {
				return next(c)
			}

			if isSafeMethod(c.Request().Method) {
				ensureCSRFCookie(c, cookieDomain)
				return next(c)
			}

			if isOAuthCallback(c.Request().URL.Path) {
				return next(c)
			}

			if hasBearerAuthorization(c) {
				return next(c)
			}

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

func isLocalhost(c echo.Context) bool {
	host := c.Request().Host
	if host == "" {
		return false
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func hasBearerAuthorization(c echo.Context) bool {
	return strings.HasPrefix(c.Request().Header.Get(echo.HeaderAuthorization), "Bearer ")
}

func isOAuthCallback(path string) bool {
	return strings.HasSuffix(path, "/auth/google/callback") ||
		strings.HasSuffix(path, "/auth/callback")
}

func ensureCSRFCookie(c echo.Context, cookieDomain string) {
	token := ""
	if ck, err := c.Cookie(csrfCookieName); err == nil && ck.Value != "" {
		token = ck.Value
	} else {
		token = generateCSRFToken()
	}

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

	c.SetCookie(&http.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		Domain:   cookieDomain,
		MaxAge:   86400,
		HttpOnly: false,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
}

func generateCSRFToken() string {
	b := make([]byte, csrfTokenLen)
	if _, err := rand.Read(b); err != nil {
		base := time.Now().UnixNano()
		for i := range b {
			b[i] = byte((base>>uint(i%8))>>uint(i%7)) ^ byte(i)
		}
	}
	return base64.URLEncoding.EncodeToString(b)
}
