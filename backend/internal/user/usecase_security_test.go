package user

import (
	"context"
	"testing"
	"time"

	jwtpkg "github.com/ahmadhafizh/navisha/backend/pkg/jwt"
)

type sessionRepoMock struct {
	createdID, createdUser string
	createdHash            []byte
	rotatedOldID           string
	rotatedOldHash         []byte
	rotatedNewID           string
	revokedID              string
}

func (m *sessionRepoMock) FindByID(context.Context, string) (*User, error) { return nil, ErrNotFound }
func (m *sessionRepoMock) FindByGoogleID(context.Context, string) (*User, error) {
	return nil, ErrNotFound
}
func (m *sessionRepoMock) Upsert(_ context.Context, u *User) (*User, error) { return u, nil }
func (m *sessionRepoMock) CreateRefreshSession(_ context.Context, id, userID string, hash []byte, _ time.Time) error {
	m.createdID, m.createdUser, m.createdHash = id, userID, append([]byte(nil), hash...)
	return nil
}
func (m *sessionRepoMock) RotateRefreshSession(_ context.Context, oldID, _ string, oldHash []byte, newID string, _ []byte, _ time.Time) error {
	m.rotatedOldID, m.rotatedOldHash, m.rotatedNewID = oldID, append([]byte(nil), oldHash...), newID
	return nil
}
func (m *sessionRepoMock) RevokeRefreshSession(_ context.Context, id, _ string, _ []byte) error {
	m.revokedID = id
	return nil
}

func TestIssueTokensPersistsHashedRefreshSession(t *testing.T) {
	repo := &sessionRepoMock{}
	svc := jwtpkg.NewService("access-secret", "refresh-secret", 3600, 604800)
	u := NewUsecase(repo, svc, nil, nil)

	tokens, err := u.issueTokens(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("issueTokens: %v", err)
	}
	if repo.createdID == "" || repo.createdUser != "user-1" {
		t.Fatalf("session not persisted correctly: id=%q user=%q", repo.createdID, repo.createdUser)
	}
	if string(repo.createdHash) == tokens.RefreshToken || len(repo.createdHash) != 32 {
		t.Fatal("repository must receive a SHA-256 token hash, not the raw refresh token")
	}
}

func TestRefreshTokensRotatesSingleUseSession(t *testing.T) {
	repo := &sessionRepoMock{}
	svc := jwtpkg.NewService("access-secret", "refresh-secret", 3600, 604800)
	u := NewUsecase(repo, svc, nil, nil)
	oldToken, _, err := svc.GenerateRefreshTokenForSession("user-1", "old-session")
	if err != nil {
		t.Fatal(err)
	}

	tokens, err := u.RefreshTokens(context.Background(), oldToken)
	if err != nil {
		t.Fatalf("RefreshTokens: %v", err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" || tokens.RefreshToken == oldToken {
		t.Fatal("refresh must issue a new token pair")
	}
	if repo.rotatedOldID != "old-session" || repo.rotatedNewID == "" || repo.rotatedNewID == repo.rotatedOldID {
		t.Fatalf("unexpected rotation: old=%q new=%q", repo.rotatedOldID, repo.rotatedNewID)
	}
	if string(repo.rotatedOldHash) == oldToken || len(repo.rotatedOldHash) != 32 {
		t.Fatal("rotation must compare a hash of the old token")
	}
}

func TestLogoutRevokesRefreshSession(t *testing.T) {
	repo := &sessionRepoMock{}
	svc := jwtpkg.NewService("access-secret", "refresh-secret", 3600, 604800)
	u := NewUsecase(repo, svc, nil, nil)
	token, _, err := svc.GenerateRefreshTokenForSession("user-1", "session-to-revoke")
	if err != nil {
		t.Fatal(err)
	}
	if err := u.Logout(context.Background(), token); err != nil {
		t.Fatalf("Logout: %v", err)
	}
	if repo.revokedID != "session-to-revoke" {
		t.Fatalf("revoked session = %q", repo.revokedID)
	}
}
