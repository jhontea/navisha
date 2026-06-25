package user

import "errors"

var ErrNotFound = errors.New("user not found")

type Repository interface {
	FindByID(id string) (*User, error)
	FindByGoogleID(googleID string) (*User, error)
	Upsert(u *User) (*User, error)
}
