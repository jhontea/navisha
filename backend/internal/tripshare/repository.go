package tripshare

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound        = errors.New("share link not found")
	ErrExpired         = errors.New("share link expired")
	ErrInvalidDuration = errors.New("invalid share duration")
	ErrInvalidToken    = errors.New("invalid share token")
)

type Repository interface {
	Create(ctx context.Context, tripID, userID string, expiresAt time.Time) (*Link, error)
	FindActive(ctx context.Context, tripID, userID string) (*Link, error)
	Revoke(ctx context.Context, tripID, userID string) error
	Resolve(ctx context.Context, linkID string) (*PublicItinerary, error)
}
