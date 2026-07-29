package user

import (
	"context"
	"errors"
)

var ErrNotFound = errors.New("user not found")

type Repository interface {
	FindByID(ctx context.Context, id string) (*User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*User, error)
	Upsert(ctx context.Context, u *User) (*User, error)
}
