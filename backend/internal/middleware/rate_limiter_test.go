package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	jwtpkg "github.com/ahmadhafizh/navisha/backend/pkg/jwt"
	"github.com/labstack/echo/v4"
)

func TestRateLimitIdentifierRequiresValidJWT(t *testing.T) {
	trusted := jwtpkg.NewService("trusted-access", "trusted-refresh", 3600, 604800)
	attacker := jwtpkg.NewService("attacker-access", "attacker-refresh", 3600, 604800)
	forged, err := attacker.GenerateAccessToken("forged-user")
	if err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	e.IPExtractor = echo.ExtractIPDirect()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.RemoteAddr = "203.0.113.5:12345"
	req.AddCookie(&http.Cookie{Name: "access_token", Value: forged})
	ident := (&RateLimiter{jwtSvc: trusted}).identifier(e.NewContext(req, httptest.NewRecorder()))
	if ident != "ip:203.0.113.5" {
		t.Fatalf("identifier = %q, want IP fallback for forged JWT", ident)
	}
}

func TestRateLimitIdentifierUsesValidatedUser(t *testing.T) {
	trusted := jwtpkg.NewService("trusted-access", "trusted-refresh", 3600, 604800)
	token, err := trusted.GenerateAccessToken("user-1")
	if err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/trips", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	ident := (&RateLimiter{jwtSvc: trusted}).identifier(e.NewContext(req, httptest.NewRecorder()))
	if ident != "user-1" {
		t.Fatalf("identifier = %q, want validated user", ident)
	}
}
