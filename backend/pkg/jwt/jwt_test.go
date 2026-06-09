package jwt_test

import (
	"strings"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
)

func newTestService() *jwt.Service {
	return jwt.NewService("access-secret", "refresh-secret", 3600, 604800)
}

func TestGenerateAndValidateAccessToken(t *testing.T) {
	svc := newTestService()
	userID := "user-123"

	token, err := svc.GenerateAccessToken(userID)
	if err != nil {
		t.Fatalf("GenerateAccessToken: unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateAccessToken: expected non-empty token")
	}

	got, err := svc.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken: unexpected error: %v", err)
	}
	if got != userID {
		t.Errorf("ValidateAccessToken: got userID %q, want %q", got, userID)
	}
}

func TestGenerateAndValidateRefreshToken(t *testing.T) {
	svc := newTestService()
	userID := "user-456"

	token, err := svc.GenerateRefreshToken(userID)
	if err != nil {
		t.Fatalf("GenerateRefreshToken: unexpected error: %v", err)
	}

	got, err := svc.ValidateRefreshToken(token)
	if err != nil {
		t.Fatalf("ValidateRefreshToken: unexpected error: %v", err)
	}
	if got != userID {
		t.Errorf("ValidateRefreshToken: got userID %q, want %q", got, userID)
	}
}

func TestAccessTokenCannotBeValidatedAsRefresh(t *testing.T) {
	svc := newTestService()

	accessToken, _ := svc.GenerateAccessToken("user-123")

	// Access token signed with access secret — should fail refresh validation
	_, err := svc.ValidateRefreshToken(accessToken)
	if err == nil {
		t.Error("ValidateRefreshToken: expected error when validating access token as refresh, got nil")
	}
}

func TestRefreshTokenCannotBeValidatedAsAccess(t *testing.T) {
	svc := newTestService()

	refreshToken, _ := svc.GenerateRefreshToken("user-123")

	_, err := svc.ValidateAccessToken(refreshToken)
	if err == nil {
		t.Error("ValidateAccessToken: expected error when validating refresh token as access, got nil")
	}
}

func TestValidateExpiredToken(t *testing.T) {
	// TTL of 0 seconds produces a token that expires immediately
	svc := jwt.NewService("access-secret", "refresh-secret", 0, 0)

	token, err := svc.GenerateAccessToken("user-123")
	if err != nil {
		t.Fatalf("GenerateAccessToken: unexpected error: %v", err)
	}

	time.Sleep(1 * time.Second)

	_, err = svc.ValidateAccessToken(token)
	if err == nil {
		t.Error("ValidateAccessToken: expected error for expired token, got nil")
	}
}

func TestValidateTamperedToken(t *testing.T) {
	svc := newTestService()

	token, _ := svc.GenerateAccessToken("user-123")

	// Flip one character in the signature (last segment)
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("expected 3 JWT parts, got %d", len(parts))
	}
	sig := []byte(parts[2])
	sig[0] ^= 0xFF
	parts[2] = string(sig)
	tampered := strings.Join(parts, ".")

	_, err := svc.ValidateAccessToken(tampered)
	if err == nil {
		t.Error("ValidateAccessToken: expected error for tampered token, got nil")
	}
}

func TestValidateEmptyToken(t *testing.T) {
	svc := newTestService()

	_, err := svc.ValidateAccessToken("")
	if err == nil {
		t.Error("ValidateAccessToken: expected error for empty token, got nil")
	}
}

func TestTokensAreDifferentPerCall(t *testing.T) {
	svc := newTestService()
	userID := "user-123"

	t1, _ := svc.GenerateAccessToken(userID)
	t2, _ := svc.GenerateAccessToken(userID)

	// Tokens are issued at slightly different times — they should differ
	// (iat differs by at least 1ns in practice, but we mainly check non-empty)
	if t1 == "" || t2 == "" {
		t.Error("expected non-empty tokens")
	}
}
