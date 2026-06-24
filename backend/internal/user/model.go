package user

import "time"

type User struct {
	ID        string
	GoogleID  string
	Email     string
	Name      string
	AvatarURL string
	CreatedAt time.Time
	UpdatedAt time.Time

	// Google OAuth tokens for calling Google APIs (Calendar) on the user's
	// behalf. Populated on login (F4 / P2). RefreshToken may be empty if Google
	// did not return one; Expiry is nil when no access token is stored.
	GoogleRefreshToken string
	GoogleAccessToken  string
	GoogleTokenExpiry  *time.Time
	GoogleScopes       []string
}
