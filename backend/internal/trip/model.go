package trip

import "time"

// Trip represents a travel itinerary owned by a user.
type Trip struct {
	ID            string    // Unique trip identifier
	UserID        string    // Owner user ID
	Title         string    // Trip title
	Description   string    // Trip description/destination
	StartDate     time.Time // Trip start date
	EndDate       time.Time // Trip end date
	BaseCurrency  string    // Base currency for expenses (e.g. "IDR")
	Budget        float64   // Budget in base currency (0 = no budget)
	CoverImageURL string    // Optional cover image URL
	Notes         string    // Optional trip notes
	CreatedAt     time.Time // Record creation timestamp
	UpdatedAt     time.Time // Last update timestamp
}

// Day represents a single day within a trip itinerary.
type Day struct {
	ID        string    // Unique day identifier
	TripID    string    // Parent trip ID
	Date      time.Time // Date of this day
	DayNumber int       // Sequential day number (1-indexed)
	Notes     string    // Optional day notes
}

// Transportation and Accommodation moved to their own domains
// (internal/transportation, internal/accommodation).
