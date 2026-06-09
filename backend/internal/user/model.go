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
}
