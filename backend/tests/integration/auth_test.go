package integration

import (
	"net/http"
	"testing"

	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
)

// newJWTService creates a JWT service using the global config.
func newJWTService() *jwt.Service {
	return jwt.NewService(
		globalCfg.JWTSecret,
		globalCfg.JWTRefreshSecret,
		globalCfg.AccessTTL,
		globalCfg.RefreshTTL,
	)
}

// TestAuth_MainFlow tests the main auth endpoints with a valid token.
func TestAuth_MainFlow(t *testing.T) {
	ctx := globalCtx

	t.Run("GET /auth/me with valid token returns user profile", func(t *testing.T) {
		resp := apiGet(t, ctx, "/auth/me")
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["id"] != ctx.UserID {
			t.Errorf("expected user id %q, got %q", ctx.UserID, body["id"])
		}
		if body["email"] == "" {
			t.Error("expected non-empty email")
		}
		if body["name"] == "" {
			t.Error("expected non-empty name")
		}
	})

	t.Run("POST /auth/logout clears cookies and returns 200", func(t *testing.T) {
		resp := apiPost(t, ctx, "/auth/logout", nil)
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["message"] != "logged out" {
			t.Errorf("expected message 'logged out', got %q", body["message"])
		}
	})
}

// TestAuth_NoToken tests endpoints without any authentication.
func TestAuth_NoToken(t *testing.T) {
	// We need a context without token for this test
	path := "/auth/me"

	t.Run("GET /auth/me without token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, globalCtx.BaseURL+path, nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		resp, err := globalCtx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("GET /auth/me with invalid token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, globalCtx.BaseURL+path, nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer invalid-token-that-is-definitely-not-valid")
		resp, err := globalCtx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatus(t, resp, http.StatusUnauthorized)
	})
}

// TestAuth_Refresh tests the refresh token endpoint.
func TestAuth_Refresh(t *testing.T) {
	ctx := globalCtx

	t.Run("POST /auth/refresh with valid refresh token returns 200", func(t *testing.T) {
		// Generate a valid refresh token
		jwtSvc := newJWTService()
		refreshToken, err := jwtSvc.GenerateRefreshToken(ctx.UserID)
		if err != nil {
			t.Fatalf("failed to generate refresh token: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/auth/refresh", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.AddCookie(&http.Cookie{
			Name:  "refresh_token",
			Value: refreshToken,
		})
		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatus(t, resp, http.StatusOK)
	})

	t.Run("POST /auth/refresh without cookie returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/auth/refresh", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("POST /auth/refresh with invalid token returns 401", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, ctx.BaseURL+"/auth/refresh", nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}
		req.AddCookie(&http.Cookie{
			Name:  "refresh_token",
			Value: "invalid-refresh-token",
		})
		resp, err := ctx.HTTPClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		assertStatus(t, resp, http.StatusUnauthorized)
	})
}
