package integration

import (
	"encoding/json"
	"net/http"

	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

// TripActivitiesHandler exposes the existing batch activity query as a
// trip-scoped read model while keeping cross-domain orchestration isolated.
type TripActivitiesHandler struct {
	trips      trip.UsecaseInterface
	activities activity.UsecaseInterface
}

func NewTripActivitiesHandler(trips trip.UsecaseInterface, activities activity.UsecaseInterface) *TripActivitiesHandler {
	return &TripActivitiesHandler{trips: trips, activities: activities}
}

func (h *TripActivitiesHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/activities", h.List, authMiddleware)
}

func (h *TripActivitiesHandler) List(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}

	tripID := c.Param("trip_id")
	_, days, err := h.trips.Get(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapTripActivitiesError(err)
	}

	dayIDs := make([]string, len(days))
	for i, day := range days {
		dayIDs[i] = day.ID
	}
	byDay, err := h.activities.ListByDayIDs(c.Request().Context(), userID, dayIDs)
	if err != nil {
		return mapTripActivitiesError(err)
	}

	response := make(map[string][]map[string]any, len(dayIDs))
	for _, dayID := range dayIDs {
		items := byDay[dayID]
		response[dayID] = make([]map[string]any, 0, len(items))
		for i := range items {
			response[dayID] = append(response[dayID], activityResponse(&items[i]))
		}
	}

	return c.JSON(http.StatusOK, map[string]any{"items_by_day": response})
}

func activityResponse(item *activity.Activity) map[string]any {
	var payload any
	if len(item.Payload) > 0 {
		_ = json.Unmarshal(item.Payload, &payload)
	}
	return map[string]any{
		"id": item.ID, "day_id": item.DayID, "type": string(item.Type),
		"title": item.Title, "start_time": item.StartTime, "end_time": item.EndTime,
		"order_index": item.OrderIndex, "payload": payload,
		"created_at": item.CreatedAt, "updated_at": item.UpdatedAt,
	}
}

func mapTripActivitiesError(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: trip.ErrNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: activity.ErrDayNotFound, Code: http.StatusNotFound, Message: "day not found"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
