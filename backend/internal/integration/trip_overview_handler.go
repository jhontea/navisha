package integration

import (
	"fmt"
	"net/http"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/transportation"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

// TripOverviewHandler serves the complete overview read model in one network
// round trip. Domain usecases remain responsible for authorization and data
// access; this handler only orchestrates their independent reads.
type TripOverviewHandler struct {
	trips          trip.UsecaseInterface
	activities     activity.UsecaseInterface
	accommodations accommodation.UsecaseInterface
	transportation transportation.UsecaseInterface
	expenses       expense.UsecaseInterface
}

func NewTripOverviewHandler(
	trips trip.UsecaseInterface,
	activities activity.UsecaseInterface,
	accommodations accommodation.UsecaseInterface,
	transportation transportation.UsecaseInterface,
	expenses expense.UsecaseInterface,
) *TripOverviewHandler {
	return &TripOverviewHandler{
		trips: trips, activities: activities, accommodations: accommodations,
		transportation: transportation, expenses: expenses,
	}
}

func (h *TripOverviewHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/overview", h.Get, authMiddleware)
}

type overviewPart struct {
	name  string
	value any
	err   error
}

func (h *TripOverviewHandler) Get(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}

	ctx := c.Request().Context()
	tripID := c.Param("trip_id")
	t, days, err := h.trips.Get(ctx, userID, tripID)
	if err != nil {
		return mapTripOverviewError(err)
	}

	dayIDs := make([]string, len(days))
	for i := range days {
		dayIDs[i] = days[i].ID
	}

	parts := make(chan overviewPart, 4)
	go func() {
		items, partErr := h.activities.ListByDayIDs(ctx, userID, dayIDs)
		parts <- overviewPart{name: "activities", value: items, err: partErr}
	}()
	go func() {
		items, partErr := h.accommodations.List(ctx, userID, tripID)
		parts <- overviewPart{name: "accommodations", value: items, err: partErr}
	}()
	go func() {
		items, partErr := h.transportation.List(ctx, userID, tripID)
		parts <- overviewPart{name: "transportations", value: items, err: partErr}
	}()
	go func() {
		summary, partErr := h.expenses.Summary(ctx, userID, tripID)
		parts <- overviewPart{name: "expense_summary", value: summary, err: partErr}
	}()

	response := map[string]any{
		"trip": tripOverviewTripResponse(t, days),
	}
	for range 4 {
		part := <-parts
		if part.err != nil {
			return mapTripOverviewError(fmt.Errorf("trip overview %s: %w", part.name, part.err))
		}
		switch part.name {
		case "activities":
			response[part.name] = map[string]any{"items_by_day": overviewActivities(dayIDs, part.value.(map[string][]activity.Activity))}
		case "accommodations":
			response[part.name] = map[string]any{"items": overviewAccommodations(part.value.([]accommodation.Accommodation))}
		case "transportations":
			response[part.name] = map[string]any{"items": overviewTransportations(part.value.([]transportation.Transportation))}
		case "expense_summary":
			response[part.name] = overviewExpenseSummary(part.value.(*expense.Summary))
		}
	}

	return c.JSON(http.StatusOK, response)
}

func tripOverviewTripResponse(t *trip.Trip, days []trip.Day) map[string]any {
	dayItems := make([]map[string]any, 0, len(days))
	for i := range days {
		dayItems = append(dayItems, map[string]any{
			"id": days[i].ID, "trip_id": days[i].TripID,
			"date": days[i].Date.Format("2006-01-02"), "day_number": days[i].DayNumber,
			"title": days[i].Title, "notes": days[i].Notes,
		})
	}
	return map[string]any{
		"id": t.ID, "user_id": t.UserID, "title": t.Title, "description": t.Description,
		"start_date": t.StartDate.Format("2006-01-02"), "end_date": t.EndDate.Format("2006-01-02"),
		"base_currency": t.BaseCurrency, "budget": t.Budget, "budget_categories": t.BudgetCategories,
		"cover_image_url": t.CoverImageURL, "notes": t.Notes,
		"created_at": t.CreatedAt, "updated_at": t.UpdatedAt, "days": dayItems,
	}
}

func overviewActivities(dayIDs []string, byDay map[string][]activity.Activity) map[string][]map[string]any {
	response := make(map[string][]map[string]any, len(dayIDs))
	for _, dayID := range dayIDs {
		items := byDay[dayID]
		response[dayID] = make([]map[string]any, 0, len(items))
		for i := range items {
			response[dayID] = append(response[dayID], activityResponse(&items[i]))
		}
	}
	return response
}

func overviewAccommodations(items []accommodation.Accommodation) []map[string]any {
	response := make([]map[string]any, 0, len(items))
	for i := range items {
		a := &items[i]
		response = append(response, map[string]any{
			"id": a.ID, "trip_id": a.TripID, "accommodation_type": string(a.AccommodationType),
			"name": a.Name, "location_name": a.LocationName, "lat": a.Lat, "lng": a.Lng,
			"google_place_id": a.GooglePlaceID, "check_in": a.CheckIn.Format("2006-01-02"),
			"check_out": a.CheckOut.Format("2006-01-02"), "confirmation_number": a.ConfirmationNumber,
			"notes": a.Notes, "created_at": a.CreatedAt, "updated_at": a.UpdatedAt,
		})
	}
	return response
}

func overviewTransportations(items []transportation.Transportation) []map[string]any {
	response := make([]map[string]any, 0, len(items))
	for i := range items {
		t := &items[i]
		response = append(response, map[string]any{
			"id": t.ID, "trip_id": t.TripID, "type": string(t.Type), "label": t.Label,
			"operator": t.Operator, "reference_number": t.ReferenceNumber,
			"from_location": t.FromLocation, "to_location": t.ToLocation,
			"departure_datetime": overviewTimeUTC(t.DepartureDatetime),
			"arrival_datetime":   overviewTimeUTC(t.ArrivalDatetime), "notes": t.Notes,
			"created_at": t.CreatedAt, "updated_at": t.UpdatedAt,
		})
	}
	return response
}

func overviewTimeUTC(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func overviewExpenseSummary(summary *expense.Summary) map[string]any {
	categories := make([]map[string]any, 0, len(summary.ByCategory))
	for _, item := range summary.ByCategory {
		categories = append(categories, map[string]any{"category": string(item.Category), "total": item.Total})
	}
	return map[string]any{
		"total_base": summary.TotalBase, "base_currency": summary.BaseCurrency, "by_category": categories,
	}
}

func mapTripOverviewError(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: trip.ErrNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: activity.ErrDayNotFound, Code: http.StatusNotFound, Message: "day not found"},
		apperr.HTTPMapping{Err: accommodation.ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: transportation.ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: expense.ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
