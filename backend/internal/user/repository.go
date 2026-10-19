package user

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("user not found")
var ErrInvalidSession = errors.New("refresh session is invalid or expired")

// ErrSessionRecentlyRotated: the token was rotated moments ago, usually by a
// concurrent refresh from another tab of the same browser.
var ErrSessionRecentlyRotated = errors.New("refresh session was just rotated")

// ErrSessionReused: an already-rotated token was presented again later.
var ErrSessionReused = errors.New("rotated refresh session was reused")

type Repository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*User, error)
	Upsert(ctx context.Context, u *User) (*User, error)
	CreateRefreshSession(ctx context.Context, id, userID string, tokenHash []byte, expiresAt time.Time) error
	RotateRefreshSession(ctx context.Context, oldID, userID string, oldHash []byte, newID string, newHash []byte, newExpiresAt time.Time) error
	RevokeRefreshSession(ctx context.Context, id, userID string, tokenHash []byte) error
	// DeleteStaleRefreshSessions removes sessions that expired or were revoked
	// more than olderThan ago, and returns how many were deleted.
	DeleteStaleRefreshSessions(ctx context.Context, olderThan time.Duration) (int64, error)
}
