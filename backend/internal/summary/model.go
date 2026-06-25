package summary

import "time"

// Summary is a persisted AI-generated trip summary. One per trip.
type Summary struct {
	ID        string
	TripID    string
	Content   string
	Model     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// TripContext is the cross-domain snapshot fed to the LLM prompt. Assembled
// by an adapter (internal/integration) so the summary package stays decoupled
// from the individual domain packages.
type TripContext struct {
	TripID       string // Phase 3E: for deterministic style variation
	Title        string
	Destination  string
	StartDate    time.Time
	EndDate      time.Time
	TotalDays    int
	BaseCurrency string
	Budget       float64
	TotalSpent   float64

	Days              []DayContext
	Accommodations    []AccommodationContext
	Transportations   []TransportationContext
	ExpenseByCategory []CategoryTotal
}

type DayContext struct {
	DayNumber  int
	Date       time.Time
	Activities []ActivityContext
}

type ActivityContext struct {
	Type         string
	Title        string
	StartTime    string
	EndTime      string
	LocationName string
}

type AccommodationContext struct {
	Name         string
	Type         string
	LocationName string
	CheckIn      time.Time
	CheckOut     time.Time
}

type TransportationContext struct {
	Type              string
	FromLocation      string
	ToLocation        string
	DepartureDatetime *time.Time
	ArrivalDatetime   *time.Time
}

type CategoryTotal struct {
	Category string
	Total    float64
}
