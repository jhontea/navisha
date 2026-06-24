// Package calendarexport implements F4 — exporting a trip's location activities
// to the user's Google Calendar and removing them again.
//
// Cross-domain data (activities, trip dates) is supplied via the DataProvider
// interface, satisfied by an adapter in internal/integration, so this package
// never imports the individual domain packages directly. The Google OAuth token
// comes from a TokenProvider satisfied by the user usecase.
package calendarexport

import (
	"context"
	"time"

	gooauth2 "golang.org/x/oauth2"
)

// SourceTypeActivity is the only source type exported in the MVP.
const SourceTypeActivity = "activity"

// CalendarItem is one exportable location activity, flattened from the
// cross-domain trip data. Date is the day's date (UTC). StartTime/EndTime are
// free-form "HH:MM" strings; empty means an all-day event.
type CalendarItem struct {
	ActivityID   string
	Title        string
	LocationName string
	Address      string
	Date         time.Time
	StartTime    string
	EndTime      string
}

// Export is a persisted mapping between a Navisha entity and its Google event.
type Export struct {
	ID               string
	UserID           string
	TripID           string
	SourceType       string
	SourceID         string
	GoogleEventID    string
	GoogleCalendarID string
	CreatedAt        time.Time
}

// DataProvider supplies the cross-domain data needed to export a trip.
// Implemented by internal/integration. Implementations MUST enforce ownership
// (return an error if userID does not own tripID).
type DataProvider interface {
	GetCalendarItems(ctx context.Context, userID, tripID string) ([]CalendarItem, error)
}

// TokenProvider returns a user's stored Google OAuth token. Implemented by the
// user usecase. Returns ErrNoToken when the user has no usable token.
type TokenProvider interface {
	GoogleToken(userID string) (*gooauth2.Token, error)
}
