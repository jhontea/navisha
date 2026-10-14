package summary

import "time"

// Summary is a persisted AI-generated trip summary. One per trip.
type Summary struct {
	ID              string
	TripID          string
	Content         string
	Model           string
	SourceUpdatedAt time.Time
	IsOutdated      bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// TripContext is the cross-domain snapshot fed to the LLM prompt. Assembled
// by an adapter (internal/integration) so the summary package stays decoupled
// from the individual domain packages.
// Language is the language the summary is written in.
type Language string

const (
	LanguageIndonesian Language = "id"
	LanguageEnglish    Language = "en"
)

// ParseLanguage maps a request value to a Language; empty means Indonesian
// (the original behavior). ok is false for any other value.
func ParseLanguage(s string) (lang Language, ok bool) {
	switch Language(s) {
	case "", LanguageIndonesian:
		return LanguageIndonesian, true
	case LanguageEnglish:
		return LanguageEnglish, true
	}
	return "", false
}

type TripContext struct {
	TripID string // Phase 3E: for deterministic style variation
	// Language of the summary to write (set by the usecase, not the provider).
	Language      Language
	Title         string
	Destination   string
	StartDate     time.Time
	EndDate       time.Time
	TotalDays     int
	BaseCurrency  string
	Budget        float64
	TotalSpent    float64
	TripUpdatedAt time.Time

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
