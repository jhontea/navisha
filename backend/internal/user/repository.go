package user

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("user not found")
var ErrInvalidSession = errors.New("refresh session is invalid or expired")

type Repository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*User, error)
	Upsert(ctx context.Context, u *User) (*User, error)
	CreateRefreshSession(ctx context.Context, id, userID string, tokenHash []byte, expiresAt time.Time) error
	RotateRefreshSession(ctx context.Context, oldID, userID string, oldHash []byte, newID string, newHash []byte, newExpiresAt time.Time) error
	RevokeRefreshSession(ctx context.Context, id, userID string, tokenHash []byte) error
}
