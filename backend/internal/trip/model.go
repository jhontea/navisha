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

// Transportation and Accommodation kept here until their own domains exist.
// They reference TripID by string only — no cross-imports needed.

type Transportation struct {
	ID                string
	TripID            string
	Type              string
	Label             string
	Operator          string
	ReferenceNumber   string
	From              string
	To                string
	DepartureDatetime time.Time
	ArrivalDatetime   time.Time
	Notes             string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Accommodation struct {
	ID                 string
	TripID             string
	Name               string
	LocationName       string
	Lat                float64
	Lng                float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
	ConfirmationNumber string
	Notes              string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
