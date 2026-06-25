package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
)

// AutogenCreator implements autogen.TripCreator by reusing the trip and
// activity usecases. It creates the trip (which auto-generates day rows from
// the date range), then attaches the generated activities to the matching day.
type AutogenCreator struct {
	trips      trip.UsecaseInterface
	activities activity.UsecaseInterface
}

func NewAutogenCreator(trips trip.UsecaseInterface, activities activity.UsecaseInterface) *AutogenCreator {
	return &AutogenCreator{trips: trips, activities: activities}
}

var _ autogen.TripCreator = (*AutogenCreator)(nil)

// CreateFromDraft persists the trip then its activities. The trip create call
// generates day rows for the inclusive date range; activities are matched to
// days by day_number (1-based). startDate/endDate are YYYY-MM-DD strings.
//
// Note: trip + days are created atomically inside trip.Create. Activities are
// then added per day; a failure mid-way leaves the trip created with partial
// activities. For MVP this is acceptable (user can edit), and the trip itself
// is always consistent.
func (c *AutogenCreator) CreateFromDraft(ctx context.Context, userID string, draft autogen.TripDraft, startDate, endDate, coverImageURL, description string) (string, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return "", fmt.Errorf("autogen.CreateFromDraft: parse start date: %w", err)
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return "", fmt.Errorf("autogen.CreateFromDraft: parse end date: %w", err)
	}

	t, err := c.trips.Create(ctx, userID, trip.CreateInput{
		Title:         draft.Title,
		Description:   description,
		Notes:         draft.Summary,
		StartDate:     start,
		EndDate:       end,
		BaseCurrency:  draft.BaseCurrency,
		Budget:        draft.Budget,
		CoverImageURL: coverImageURL,
	})
	if err != nil {
		return "", fmt.Errorf("autogen.CreateFromDraft: create trip: %w", err)
	}

	// Fetch the auto-generated days to map day_number -> day ID.
	_, days, err := c.trips.Get(userID, t.ID)
	if err != nil {
		return t.ID, fmt.Errorf("autogen.CreateFromDraft: load days: %w", err)
	}
	dayByNumber := make(map[int]string, len(days))
	for _, d := range days {
		dayByNumber[d.DayNumber] = d.ID
	}

	for _, dd := range draft.Days {
		dayID, ok := dayByNumber[dd.DayNumber]
		if !ok {
			continue // out-of-range day number; skip defensively
		}
		for _, a := range dd.Activities {
			payload, perr := buildActivityPayload(a)
			if perr != nil {
				continue // skip activities we can't encode rather than failing the whole trip
			}
			_, err := c.activities.Create(ctx, userID, dayID, activity.CreateInput{
				Type:      activity.Type(a.Type),
				Title:     a.Title,
				StartTime: a.StartTime,
				EndTime:   a.EndTime,
				Payload:   payload,
			})
			if err != nil {
				return t.ID, fmt.Errorf("autogen.CreateFromDraft: create activity: %w", err)
			}
		}
	}

	return t.ID, nil
}

// buildActivityPayload encodes the draft activity into the activity domain's
// per-type payload JSON.
func buildActivityPayload(a autogen.ActivityDraft) (json.RawMessage, error) {
	switch activity.Type(a.Type) {
	case activity.TypeLocation:
		lp := activity.LocationPayload{
			LocationName:  a.LocationName,
			Address:       a.Address,
			GooglePlaceID: a.GooglePlaceID,
			Notes:         a.Notes,
		}
		// Check for AI-provided coordinates — if null, skip (frontend resolves).
		if a.Lat != nil {
			lp.Lat = *a.Lat
		}
		if a.Lng != nil {
			lp.Lng = *a.Lng
		}
		return json.Marshal(lp)
	case activity.TypeNote:
		content := a.Notes
		if content == "" {
			content = a.Title
		}
		return json.Marshal(activity.NotePayload{Content: content})
	default:
		return nil, fmt.Errorf("unsupported activity type %q", a.Type)
	}
}
