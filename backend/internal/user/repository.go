package user

import (
	"errors"

	gooauth2 "golang.org/x/oauth2"
)

var ErrNotFound = errors.New("user not found")

type Repository interface {
	FindByID(id string) (*User, error)
	FindByGoogleID(googleID string) (*User, error)
	Upsert(u *User) (*User, error)
	// UpdateGoogleTokens persists the user's Google OAuth tokens + granted
	// scopes so the backend can call Google APIs on their behalf (F4).
	UpdateGoogleTokens(userID string, token *gooauth2.Token, scopes []string) error
	// GetGoogleToken returns the stored Google OAuth token + scopes for a user.
	// Returns ErrNotFound if the user does not exist.
	GetGoogleToken(userID string) (*gooauth2.Token, []string, error)
}
