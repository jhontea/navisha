package calendarexport

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/googlecalendar"
	gooauth2 "golang.org/x/oauth2"
)

// ErrReauthRequired signals the user must re-authorize Google access (no usable
// token, or Google rejected the token). Mapped to 401 GOOGLE_REAUTH_REQUIRED.
var ErrReauthRequired = errors.New("calendarexport: google reauthorization required")

// defaultTimeZone is the IANA timezone label attached to timed events. Activity
// times are stored as naive wall-clock ("HH:MM") with no timezone, so we send
// them as-is (no UTC conversion) and tag them with the app's default zone so the
// event shows the exact time the user entered. Navisha is WIB-centric.
const defaultTimeZone = "Asia/Jakarta"

// CalendarClient is the subset of the Google Calendar client this usecase needs.
type CalendarClient interface {
	CreateEvent(ctx context.Context, token *gooauth2.Token, calendarID string, ev googlecalendar.Event) (string, error)
	DeleteEvent(ctx context.Context, token *gooauth2.Token, calendarID, eventID string) error
}

type UsecaseInterface interface {
	ExportTrip(ctx context.Context, userID, tripID string) (ExportResult, error)
	RemoveTrip(ctx context.Context, userID, tripID string) error
	Status(userID, tripID string) (int, error)
}

// ExportResult summarizes a sync run.
type ExportResult struct {
	Created int // new events added to Google Calendar
	Removed int // stale events (deleted activities) pruned from Google Calendar
	Total   int // total events now tracked for the trip
}

type Usecase struct {
	repo   Repository
	data   DataProvider
	tokens TokenProvider
	cal    CalendarClient
}

func NewUsecase(repo Repository, data DataProvider, tokens TokenProvider, cal CalendarClient) *Usecase {
	return &Usecase{repo: repo, data: data, tokens: tokens, cal: cal}
}

var _ UsecaseInterface = (*Usecase)(nil)

// Status returns how many events are currently exported for the trip. Used by
// the frontend to decide whether the "Remove" action is available.
func (u *Usecase) Status(userID, tripID string) (int, error) {
	// Ownership is enforced by the caller route (trip-scoped) + the count query
	// is harmless; we still scope by trip_id which is a UUID.
	return u.repo.CountByTrip(tripID)
}

// ExportTrip syncs the trip's location activities to the user's Google Calendar:
//   - activities not yet exported are created
//   - previously-exported activities that no longer exist (e.g. a removed day or
//     deleted activity) have their events pruned from Google + the mapping row
//
// This makes re-export safe to run any number of times — adding or removing days
// is reflected on the next export. Returns counts of created/removed/total.
func (u *Usecase) ExportTrip(ctx context.Context, userID, tripID string) (ExportResult, error) {
	var res ExportResult

	token, err := u.tokens.GoogleToken(userID)
	if err != nil {
		return res, ErrReauthRequired
	}

	// DataProvider enforces trip ownership.
	items, err := u.data.GetCalendarItems(ctx, userID, tripID)
	if err != nil {
		return res, err
	}

	existing, err := u.repo.ListByTrip(tripID)
	if err != nil {
		return res, err
	}

	// Index current activity IDs and existing exports by source id.
	currentIDs := make(map[string]struct{}, len(items))
	for _, it := range items {
		currentIDs[it.ActivityID] = struct{}{}
	}
	exportedIDs := make(map[string]struct{}, len(existing))

	// Prune stale exports first (activities that were removed since last export).
	for _, e := range existing {
		if _, ok := currentIDs[e.SourceID]; ok {
			exportedIDs[e.SourceID] = struct{}{}
			continue
		}
		if err := u.cal.DeleteEvent(ctx, token, e.GoogleCalendarID, e.GoogleEventID); err != nil {
			if errors.Is(err, googlecalendar.ErrReauthRequired) {
				return res, ErrReauthRequired
			}
			// Log and continue; still drop the mapping so it doesn't linger.
			log.Printf("calendarexport: prune event %s: %v", e.GoogleEventID, err)
		}
		if err := u.repo.DeleteByID(e.ID); err != nil {
			return res, err
		}
		res.Removed++
	}

	// Create events for new activities.
	for _, it := range items {
		if _, ok := exportedIDs[it.ActivityID]; ok {
			continue
		}
		eventID, err := u.cal.CreateEvent(ctx, token, "primary", buildEvent(it))
		if err != nil {
			if errors.Is(err, googlecalendar.ErrReauthRequired) {
				return res, ErrReauthRequired
			}
			return res, fmt.Errorf("calendarexport.ExportTrip: create event: %w", err)
		}
		if err := u.repo.Insert(&Export{
			UserID:           userID,
			TripID:           tripID,
			SourceType:       SourceTypeActivity,
			SourceID:         it.ActivityID,
			GoogleEventID:    eventID,
			GoogleCalendarID: "primary",
		}); err != nil {
			return res, err
		}
		res.Created++
	}

	total, err := u.repo.CountByTrip(tripID)
	if err != nil {
		return res, err
	}
	res.Total = total
	return res, nil
}

// RemoveTrip deletes all Google Calendar events exported for the trip and clears
// the mapping rows. Ownership is verified via the DataProvider before touching
// Google. Best-effort: a failed event delete is logged but does not abort the
// rest, and the mapping rows are always cleared at the end.
func (u *Usecase) RemoveTrip(ctx context.Context, userID, tripID string) error {
	// Verify ownership (also returns ErrForbidden for non-owner).
	if _, err := u.data.GetCalendarItems(ctx, userID, tripID); err != nil {
		return err
	}
	return u.removeTripEvents(ctx, userID, tripID)
}

// RemoveTripInternal deletes the trip's events without an ownership check. Used
// by the delete-trip cleanup hook, where ownership was already enforced by the
// trip delete itself. Errors are logged, not returned.
func (u *Usecase) RemoveTripInternal(ctx context.Context, userID, tripID string) {
	if err := u.removeTripEvents(ctx, userID, tripID); err != nil {
		log.Printf("calendarexport: cleanup events for trip %s: %v", tripID, err)
	}
}

func (u *Usecase) removeTripEvents(ctx context.Context, userID, tripID string) error {
	exports, err := u.repo.ListByTrip(tripID)
	if err != nil {
		return err
	}
	if len(exports) == 0 {
		return nil
	}

	token, err := u.tokens.GoogleToken(userID)
	if err != nil {
		// No token: can't delete from Google, but still clear our rows so the
		// user isn't stuck. The events may linger in Google until manual removal.
		log.Printf("calendarexport: no google token for user %s, clearing mappings only", userID)
		return u.repo.DeleteByTrip(tripID)
	}

	for _, e := range exports {
		if err := u.cal.DeleteEvent(ctx, token, e.GoogleCalendarID, e.GoogleEventID); err != nil {
			if errors.Is(err, googlecalendar.ErrReauthRequired) {
				return ErrReauthRequired
			}
			log.Printf("calendarexport: delete event %s: %v", e.GoogleEventID, err)
		}
	}

	return u.repo.DeleteByTrip(tripID)
}

// buildEvent maps a CalendarItem to a Google Calendar event. When start/end
// times are present it's a timed event; otherwise an all-day event.
//
// Times are sent as naive wall-clock (no UTC conversion) tagged with
// defaultTimeZone, so the event shows the exact time the user entered.
func buildEvent(it CalendarItem) googlecalendar.Event {
	ev := googlecalendar.Event{
		Summary:     it.Title,
		Location:    locationString(it),
		Description: "Exported from Navisha",
	}

	day := it.Date.Format("2006-01-02")

	start, okStart := parseDayTime(it.Date, it.StartTime)
	end, okEnd := parseDayTime(it.Date, it.EndTime)

	switch {
	case okStart && okEnd:
		ev.Start = googlecalendar.EventDateTime{DateTime: start, TimeZone: defaultTimeZone}
		ev.End = googlecalendar.EventDateTime{DateTime: end, TimeZone: defaultTimeZone}
	case okStart:
		// Start only: default 1-hour duration.
		ev.Start = googlecalendar.EventDateTime{DateTime: start, TimeZone: defaultTimeZone}
		ev.End = googlecalendar.EventDateTime{DateTime: addHour(start), TimeZone: defaultTimeZone}
	default:
		// All-day event. Google's end date is exclusive, so use the next day.
		ev.Start = googlecalendar.EventDateTime{Date: day}
		ev.End = googlecalendar.EventDateTime{Date: it.Date.AddDate(0, 0, 1).Format("2006-01-02")}
	}

	return ev
}

func locationString(it CalendarItem) string {
	if it.Address != "" {
		return it.Address
	}
	return it.LocationName
}

// parseDayTime combines a date with a free-form "HH:MM" time string and returns
// a naive RFC3339-like datetime WITHOUT a timezone offset (e.g.
// "2026-07-01T09:30:00"). Google pairs it with the event's timeZone field.
// Returns ok=false when the time is empty or unparseable.
func parseDayTime(date time.Time, hhmm string) (string, bool) {
	if hhmm == "" {
		return "", false
	}
	t, err := time.Parse("15:04", hhmm)
	if err != nil {
		return "", false
	}
	return fmt.Sprintf("%sT%02d:%02d:00", date.Format("2006-01-02"), t.Hour(), t.Minute()), true
}

// addHour adds one hour to a naive "2006-01-02T15:04:05" datetime string.
func addHour(naive string) string {
	t, err := time.Parse("2006-01-02T15:04:05", naive)
	if err != nil {
		return naive
	}
	return t.Add(time.Hour).Format("2006-01-02T15:04:05")
}
