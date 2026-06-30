package user

import "time"

// User represents an authenticated user in the system.
type User struct {
	ID            string    // Unique user identifier
	GoogleID      string    // Google OAuth sub (stable across email changes)
	Email         string    // User email address (verified via Google OAuth)
	Name          string    // Display name from Google profile
	AvatarURL     string    // Profile picture URL from Google
	EmailVerified bool      // Whether Google has verified the email
	CreatedAt     time.Time // Account creation timestamp
	UpdatedAt     time.Time // Last profile update timestamp
}
