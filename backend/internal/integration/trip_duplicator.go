package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

const (
	copySuffix        = " (copy)"
	maxTripTitleBytes = 200 // trip.maxTitleLength
)

// The parts of the domain usecases the duplicator uses.
type (
	dupActivities interface {
		ListByTrip(ctx context.Context, userID, tripID string) (map[string][]activity.Activity, error)
		draftActivities
	}
	dupTransports interface {
		List(ctx context.Context, userID, tripID string) ([]transportation.Transportation, error)
		draftTransports
	}
	dupStays interface {
		List(ctx context.Context, userID, tripID string) ([]accommodation.Accommodation, error)
		draftStays
	}
)

// DuplicateInput is what the user picks when copying a trip.
type DuplicateInput struct {
	StartDate       time.Time
	Title           string // empty = "<source title> (copy)"
	IncludeBookings bool
}

// TripDuplicator copies a trip into a new one starting on another date: trip
// info, day titles/notes, activities (to-dos unchecked) and optionally the
// bookings, shifted by the same number of days. Expenses, share links and AI
// summaries are not copied; copied bookings carry no cost and no booking ref.
type TripDuplicator struct {
	trips      draftTrips
	activities dupActivities
	transports dupTransports
	stays      dupStays
}

func NewTripDuplicator(trips draftTrips, activities dupActivities, transports dupTransports, stays dupStays) *TripDuplicator {
	return &TripDuplicator{trips: trips, activities: activities, transports: transports, stays: stays}
}

// Duplicate creates the copy and returns it. Like AutogenCreator, trip + days
// are created atomically and the new trip is deleted again if any later write
// fails, so no half-made copy is left behind. The source is only read.
func (d *TripDuplicator) Duplicate(ctx context.Context, userID, srcID string, in DuplicateInput) (*trip.Trip, error) {
	src, srcDays, err := d.trips.Get(ctx, userID, srcID)
	if err != nil {
		return nil, err
	}
	start := civilDate(in.StartDate)
	srcStart := civilDate(src.StartDate)
	offset := int(start.Sub(srcStart).Hours() / 24)

	title := in.Title
	if strings.TrimSpace(title) == "" {
		title = copyTitle(src.Title)
	}
	sort.Slice(srcDays, func(i, j int) bool { return srcDays[i].DayNumber < srcDays[j].DayNumber })
	days := make([]trip.DayContent, 0, len(srcDays))
	for _, day := range srcDays {
		days = append(days, trip.DayContent{Title: day.Title, Notes: day.Notes})
	}

	t, err := d.trips.Create(ctx, userID, trip.CreateInput{
		Title:            title,
		Description:      src.Description,
		StartDate:        start,
		EndDate:          civilDate(src.EndDate).AddDate(0, 0, offset),
		BaseCurrency:     src.BaseCurrency,
		Budget:           src.Budget,
		BudgetCategories: src.BudgetCategories,
		CoverImageURL:    src.CoverImageURL,
		Notes:            src.Notes,
		Days:             days,
	})
	if err != nil {
		return nil, fmt.Errorf("trip.Duplicate: create trip: %w", err)
	}
	if err := d.fill(ctx, userID, src.ID, t.ID, srcDays, offset, in.IncludeBookings); err != nil {
		// The request may be cancelled by now; the cleanup must still run.
		if derr := d.trips.Delete(context.WithoutCancel(ctx), userID, t.ID); derr != nil {
			slog.Error("trip.Duplicate: delete half-made copy", "trip_id", t.ID, "error", derr)
		}
		return nil, err
	}
	return t, nil
}

func (d *TripDuplicator) fill(ctx context.Context, userID, srcID, newID string, srcDays []trip.Day, offset int, bookings bool) error {
	_, newDays, err := d.trips.Get(ctx, userID, newID)
	if err != nil {
		return fmt.Errorf("trip.Duplicate: load days: %w", err)
	}
	newDayByNumber := make(map[int]string, len(newDays))
	for _, day := range newDays {
		newDayByNumber[day.DayNumber] = day.ID
	}

	byDay, err := d.activities.ListByTrip(ctx, userID, srcID)
	if err != nil {
		return fmt.Errorf("trip.Duplicate: list activities: %w", err)
	}
	// srcDays is sorted by day number and each day's list by order_index, so
	// CreateMany keeps the source order.
	var batch []activity.CreateManyInput
	for _, day := range srcDays {
		dayID, ok := newDayByNumber[day.DayNumber]
		if !ok {
			continue
		}
		for _, a := range byDay[day.ID] {
			payload := a.Payload
			if a.Type == activity.TypeTodo {
				payload = uncheckTodos(payload)
			}
			batch = append(batch, activity.CreateManyInput{
				DayID: dayID,
				CreateInput: activity.CreateInput{
					Type: a.Type, Title: a.Title, StartTime: a.StartTime, EndTime: a.EndTime, Payload: payload,
				},
			})
		}
	}
	if err := d.activities.CreateMany(ctx, userID, batch); err != nil {
		return fmt.Errorf("trip.Duplicate: create activities: %w", err)
	}

	if !bookings {
		return nil
	}
	legs, err := d.transports.List(ctx, userID, srcID)
	if err != nil {
		return fmt.Errorf("trip.Duplicate: list transports: %w", err)
	}
	for _, l := range legs {
		// No ReferenceNumber and no Cost: nothing is booked or paid yet.
		if _, err := d.transports.Create(ctx, userID, newID, transportation.CreateInput{
			Type: l.Type, Label: l.Label, Operator: l.Operator,
			FromLocation: l.FromLocation, ToLocation: l.ToLocation,
			DepartureDatetime: shiftWallClock(l.DepartureDatetime, offset),
			ArrivalDatetime:   shiftWallClock(l.ArrivalDatetime, offset),
			Notes:             l.Notes,
		}); err != nil {
			return fmt.Errorf("trip.Duplicate: create transport: %w", err)
		}
	}
	stays, err := d.stays.List(ctx, userID, srcID)
	if err != nil {
		return fmt.Errorf("trip.Duplicate: list stays: %w", err)
	}
	for _, s := range stays {
		if _, err := d.stays.Create(ctx, userID, newID, accommodation.CreateInput{
			AccommodationType: s.AccommodationType, Name: s.Name, LocationName: s.LocationName,
			Lat: s.Lat, Lng: s.Lng, GooglePlaceID: s.GooglePlaceID,
			CheckIn:     civilDate(s.CheckIn).AddDate(0, 0, offset),
			CheckOut:    civilDate(s.CheckOut).AddDate(0, 0, offset),
			CheckInTime: s.CheckInTime, CheckOutTime: s.CheckOutTime,
			Notes: s.Notes,
		}); err != nil {
			return fmt.Errorf("trip.Duplicate: create stay: %w", err)
		}
	}
	return nil
}

// civilDate is the calendar date of a DATE column value as UTC midnight,
// whatever zone the driver read it in.
func civilDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// shiftWallClock moves a transport time by whole days. Times are stored as
// wall-clock UTC and read back in the server zone, hence .UTC().
func shiftWallClock(t *time.Time, days int) *time.Time {
	if t == nil {
		return nil
	}
	shifted := t.UTC().AddDate(0, 0, days)
	return &shifted
}

// copyTitle appends " (copy)", trimming the source title (on a rune
// boundary) so the result stays within the trip title limit.
func copyTitle(src string) string {
	limit := maxTripTitleBytes - len(copySuffix)
	for len(src) > limit {
		_, size := utf8.DecodeLastRuneInString(src)
		src = src[:len(src)-size]
	}
	return src + copySuffix
}

// uncheckTodos sets every to-do item to not completed, keeping all other
// fields. A payload it cannot read is copied as is.
func uncheckTodos(payload json.RawMessage) json.RawMessage {
	var p map[string]json.RawMessage
	if json.Unmarshal(payload, &p) != nil {
		return payload
	}
	var items []map[string]json.RawMessage
	if json.Unmarshal(p["items"], &items) != nil {
		return payload
	}
	for _, item := range items {
		item["completed"] = json.RawMessage("false")
	}
	encodedItems, err := json.Marshal(items)
	if err != nil {
		return payload
	}
	p["items"] = encodedItems
	out, err := json.Marshal(p)
	if err != nil {
		return payload
	}
	return out
}

// TripDuplicateHandler serves POST /trips/:id/duplicate.
type TripDuplicateHandler struct {
	duplicator *TripDuplicator
}

func NewTripDuplicateHandler(duplicator *TripDuplicator) *TripDuplicateHandler {
	return &TripDuplicateHandler{duplicator: duplicator}
}

func (h *TripDuplicateHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/:id/duplicate", middleware.WithUser(h.Duplicate), authMiddleware)
}

type duplicateRequest struct {
	StartDate       string `json:"start_date"`
	Title           string `json:"title"`
	IncludeBookings bool   `json:"include_bookings"`
}

func (h *TripDuplicateHandler) Duplicate(c echo.Context, userID string) error {
	var req duplicateRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date format (expect YYYY-MM-DD)")
	}
	t, err := h.duplicator.Duplicate(c.Request().Context(), userID, c.Param("id"), DuplicateInput{
		StartDate: start, Title: req.Title, IncludeBookings: req.IncludeBookings,
	})
	if err != nil {
		return trip.MapError(err)
	}
	return c.JSON(http.StatusCreated, trip.Response(t))
}
