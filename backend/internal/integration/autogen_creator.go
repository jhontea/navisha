package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/autogen"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
)

// The parts of the domain usecases the creator uses, kept narrow so tests
// can fake them.
type (
	draftTrips interface {
		Create(ctx context.Context, userID string, in trip.CreateInput) (*trip.Trip, error)
		Get(ctx context.Context, userID, tripID string) (*trip.Trip, []trip.Day, error)
		Delete(ctx context.Context, userID, tripID string) error
	}
	draftActivities interface {
		CreateMany(ctx context.Context, userID string, inputs []activity.CreateManyInput) error
	}
	draftTransports interface {
		Create(ctx context.Context, userID, tripID string, in transportation.CreateInput) (*transportation.Transportation, error)
	}
	draftStays interface {
		Create(ctx context.Context, userID, tripID string, in accommodation.CreateInput) (*accommodation.Accommodation, error)
	}
)

// AutogenCreator implements autogen.TripCreator by reusing the domain
// usecases. It creates the trip (which auto-generates day rows from the date
// range and stores the planned budget split), attaches the activities to the
// matching day, then adds the transport legs and stays.
type AutogenCreator struct {
	trips      draftTrips
	activities draftActivities
	transports draftTransports
	stays      draftStays
}

func NewAutogenCreator(trips draftTrips, activities draftActivities, transports draftTransports, stays draftStays) *AutogenCreator {
	return &AutogenCreator{trips: trips, activities: activities, transports: transports, stays: stays}
}

var _ autogen.TripCreator = (*AutogenCreator)(nil)

// CreateFromDraft persists the trip, its activities, transport legs and
// stays. The trip create call generates day rows for the inclusive date
// range; activities are matched to days by day_number (1-based).
// startDate/endDate are YYYY-MM-DD strings.
//
// Trip + days are created atomically inside trip.Create, and the activities
// in one transaction. Transports and stays live in other usecases and cannot
// share those transactions, so if any write after the trip fails, the trip is
// deleted again (its rows cascade) and no half-made trip is left behind.
//
// Estimated costs become the trip's planned budget_categories, never
// expenses: nothing has been paid yet.
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
		Title:            draft.Title,
		Description:      description,
		Notes:            draft.Summary,
		StartDate:        start,
		EndDate:          end,
		BaseCurrency:     draft.BaseCurrency,
		Budget:           draftBudget(draft),
		BudgetCategories: draft.BudgetBreakdown.Categories(),
		CoverImageURL:    coverImageURL,
	})
	if err != nil {
		return "", fmt.Errorf("autogen.CreateFromDraft: create trip: %w", err)
	}
	if err := c.fillTrip(ctx, userID, t.ID, draft); err != nil {
		if derr := c.trips.Delete(ctx, userID, t.ID); derr != nil {
			slog.Error("autogen.CreateFromDraft: delete half-made trip", "trip_id", t.ID, "error", derr)
		}
		return "", err
	}
	return t.ID, nil
}

// draftBudget keeps the total at least the split's sum, which trip.Create
// requires (categories may not exceed the budget).
func draftBudget(d autogen.TripDraft) float64 {
	if total := d.BudgetBreakdown.Total(); total > d.Budget {
		return total
	}
	return d.Budget
}

// fillTrip writes everything that hangs off the new trip.
func (c *AutogenCreator) fillTrip(ctx context.Context, userID, tripID string, draft autogen.TripDraft) error {
	// Fetch the auto-generated days to map day_number -> day ID.
	_, days, err := c.trips.Get(ctx, userID, tripID)
	if err != nil {
		return fmt.Errorf("autogen.CreateFromDraft: load days: %w", err)
	}
	dayByNumber := make(map[int]string, len(days))
	for _, d := range days {
		dayByNumber[d.DayNumber] = d.ID
	}

	batch := make([]activity.CreateManyInput, 0)
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
			batch = append(batch, activity.CreateManyInput{
				DayID: dayID,
				CreateInput: activity.CreateInput{
					Type: activity.Type(a.Type), Title: a.Title,
					StartTime: a.StartTime, EndTime: a.EndTime, Payload: payload,
				},
			})
		}
	}
	if err := c.activities.CreateMany(ctx, userID, batch); err != nil {
		return fmt.Errorf("autogen.CreateFromDraft: create activities: %w", err)
	}

	for _, leg := range draft.TransportLegs {
		in, lerr := transportInput(leg, draft.BaseCurrency)
		if lerr != nil {
			continue // a malformed leg is skipped like a bad activity
		}
		if _, err := c.transports.Create(ctx, userID, tripID, in); err != nil {
			return fmt.Errorf("autogen.CreateFromDraft: create transport: %w", err)
		}
	}
	for _, st := range draft.Lodging {
		in, serr := stayInput(st, draft.BaseCurrency)
		if serr != nil {
			continue
		}
		if _, err := c.stays.Create(ctx, userID, tripID, in); err != nil {
			return fmt.Errorf("autogen.CreateFromDraft: create stay: %w", err)
		}
	}
	return nil
}

// legTypes maps draft leg modes to transportation types.
var legTypes = map[string]transportation.Type{
	"car": transportation.TypeCar, "train": transportation.TypeTrain,
	"flight": transportation.TypeFlight, "bus": transportation.TypeBus,
}

// transportInput turns a draft leg into a transport booking. Times are wall
// clock, stored as UTC like the manual transport form does.
func transportInput(leg autogen.TransportLegDraft, currency string) (transportation.CreateInput, error) {
	typ, ok := legTypes[leg.Mode]
	if !ok {
		return transportation.CreateInput{}, fmt.Errorf("unknown leg mode %q", leg.Mode)
	}
	dep, err := wallClock(leg.DepartureDate, leg.DepartureTime)
	if err != nil {
		return transportation.CreateInput{}, err
	}
	arr, err := wallClock(leg.ArrivalDate, leg.ArrivalTime)
	if err != nil {
		return transportation.CreateInput{}, err
	}
	return transportation.CreateInput{
		Type:              typ,
		Label:             leg.Label,
		FromLocation:      leg.FromLocation,
		ToLocation:        leg.ToLocation,
		DepartureDatetime: &dep,
		ArrivalDatetime:   &arr,
		Notes:             withEstimate(leg.Notes, "Perkiraan biaya", leg.EstimatedCost, currency),
	}, nil
}

// stayInput turns a draft stay into a hotel booking with the coordinates the
// frontend resolver found (if any).
func stayInput(st autogen.LodgingDraft, currency string) (accommodation.CreateInput, error) {
	checkIn, err := time.Parse("2006-01-02", st.CheckInDate)
	if err != nil {
		return accommodation.CreateInput{}, err
	}
	checkOut, err := time.Parse("2006-01-02", st.CheckOutDate)
	if err != nil {
		return accommodation.CreateInput{}, err
	}
	return accommodation.CreateInput{
		AccommodationType: accommodation.TypeHotel,
		Name:              st.Name,
		LocationName:      st.LocationName,
		Lat:               st.Lat,
		Lng:               st.Lng,
		GooglePlaceID:     st.GooglePlaceID,
		CheckIn:           checkIn,
		CheckOut:          checkOut,
		CheckInTime:       st.CheckInTime,
		CheckOutTime:      st.CheckOutTime,
		Notes:             withEstimate(st.Notes, "Perkiraan harga per malam", st.EstimatedCostPerNight, currency),
	}, nil
}

func wallClock(date, hhmm string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", date+" "+hhmm, time.UTC)
}

// withEstimate appends the AI cost estimate to the booking notes, so it stays
// visible without being recorded as an expense.
func withEstimate(notes, label string, amount float64, currency string) string {
	notes = strings.TrimSpace(notes)
	if amount <= 0 {
		return notes
	}
	line := fmt.Sprintf("%s: %s %s", label, currency, groupThousands(amount))
	if notes == "" {
		return line
	}
	return notes + "\n" + line
}

// groupThousands formats 450000 as "450.000" (Indonesian grouping).
func groupThousands(v float64) string {
	digits := strconv.FormatFloat(v, 'f', 0, 64)
	var b strings.Builder
	for i, r := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// buildActivityPayload encodes the draft activity into the activity domain's
// per-type payload JSON.
func buildActivityPayload(a autogen.ActivityDraft) (json.RawMessage, error) {
	switch activity.Type(a.Type) {
	case activity.TypeLocation:
		lp := activity.LocationPayload{
			LocationName:         a.LocationName,
			Address:              a.Address,
			GooglePlaceID:        a.GooglePlaceID,
			Notes:                a.Notes,
			LocationVerification: a.LocationVerification,
			LocationConfidence:   a.LocationConfidence,
		}
		// Check for AI-provided coordinates — if null, skip (frontend resolves).
		if a.Lat != nil {
			lat := *a.Lat
			lp.Lat = &lat
		}
		if a.Lng != nil {
			lng := *a.Lng
			lp.Lng = &lng
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
