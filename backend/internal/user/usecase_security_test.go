package user

import (
	"context"
	"errors"
	"testing"
	"time"

	jwtpkg "github.com/jhontea/navisha/backend/pkg/jwt"
)

type sessionRepoMock struct {
	createdID, createdUser string
	createdHash            []byte
	rotatedOldID           string
	rotatedOldHash         []byte
	rotatedNewID           string
	revokedID              string
	rotateErr              error
	staleOlderThan         time.Duration
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
	return m.rotateErr
}
func (m *sessionRepoMock) RevokeRefreshSession(_ context.Context, id, _ string, _ []byte) error {
	m.revokedID = id
	return nil
}
func (m *sessionRepoMock) DeleteStaleRefreshSessions(_ context.Context, olderThan time.Duration) (int64, error) {
	m.staleOlderThan = olderThan
	return 3, nil
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

func TestRefreshTokens_ClassifiesFailedRotation(t *testing.T) {
	svc := jwtpkg.NewService("access-secret", "refresh-secret", 3600, 604800)
	oldToken, _, err := svc.GenerateRefreshTokenForSession("user-1", "old-session")
	if err != nil {
		t.Fatal(err)
	}

	t.Run("concurrent refresh from another tab", func(t *testing.T) {
		u := NewUsecase(&sessionRepoMock{rotateErr: ErrSessionRecentlyRotated}, svc, nil, nil)
		_, err := u.RefreshTokens(context.Background(), oldToken)
		if !errors.Is(err, ErrRefreshRaced) {
			t.Fatalf("err = %v, want ErrRefreshRaced", err)
		}
	})

	t.Run("reused token is rejected, not treated as a race", func(t *testing.T) {
		repo := &sessionRepoMock{rotateErr: ErrSessionReused}
		u := NewUsecase(repo, svc, nil, nil)
		_, err := u.RefreshTokens(context.Background(), oldToken)
		if err == nil || errors.Is(err, ErrRefreshRaced) || !errors.Is(err, ErrSessionReused) {
			t.Fatalf("err = %v, want a rejection wrapping ErrSessionReused", err)
		}
		if repo.revokedID != "" {
			t.Errorf("reuse must only be logged for now, but session %q was revoked", repo.revokedID)
		}
	})

	t.Run("invalid session", func(t *testing.T) {
		u := NewUsecase(&sessionRepoMock{rotateErr: ErrInvalidSession}, svc, nil, nil)
		_, err := u.RefreshTokens(context.Background(), oldToken)
		if err == nil || errors.Is(err, ErrRefreshRaced) {
			t.Fatalf("err = %v, want an invalid-session rejection", err)
		}
	})
}

func TestCleanupRefreshSessions_KeepsOneWeek(t *testing.T) {
	repo := &sessionRepoMock{}
	u := NewUsecase(repo, jwtpkg.NewService("a", "b", 3600, 604800), nil, nil)
	deleted, err := u.CleanupRefreshSessions(context.Background())
	if err != nil || deleted != 3 {
		t.Fatalf("CleanupRefreshSessions = %d, %v; want 3, nil", deleted, err)
	}
	if repo.staleOlderThan != 7*24*time.Hour {
		t.Errorf("retention = %v, want 168h", repo.staleOlderThan)
	}
}
