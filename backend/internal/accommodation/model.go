package accommodation

import "time"

// Accommodation is trip-level lodging. lat/lng optional (nullable in DB).
type Accommodation struct {
	ID                 string
	TripID             string
	Name               string
	LocationName       string
	Lat                *float64
	Lng                *float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
	ConfirmationNumber string
	Notes              string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
