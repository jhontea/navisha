package trip

import "time"

type Trip struct {
	ID            string
	UserID        string
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	Budget        float64
	CoverImageURL string
	Notes         string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Day struct {
	ID        string
	TripID    string
	Date      time.Time
	DayNumber int
	Notes     string
}

// Transportation and Accommodation moved to their own domains
// (internal/transportation, internal/accommodation).
