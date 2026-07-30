package integration

import (
	"net/http"
	"sync"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

// DashboardHandler combines the two trip reads used by the dashboard into a
// single HTTP request. Existing trip endpoints remain available as fallback.
type DashboardHandler struct {
	trips trip.UsecaseInterface
}

func NewDashboardHandler(trips trip.UsecaseInterface) *DashboardHandler {
	return &DashboardHandler{trips: trips}
}

func (h *DashboardHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/dashboard", h.Get, authMiddleware)
}

func (h *DashboardHandler) Get(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}

	ctx := c.Request().Context()
	var upcoming []trip.Trip
	var listed trip.ListResult
	var upcomingErr, listErr error
	var wait sync.WaitGroup
	wait.Add(2)
	go func() {
		defer wait.Done()
		upcoming, upcomingErr = h.trips.ListUpcoming(ctx, userID, 6)
	}()
	go func() {
		defer wait.Done()
		listed, listErr = h.trips.List(ctx, userID, "", 20)
	}()
	wait.Wait()

	if upcomingErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error").SetInternal(upcomingErr)
	}
	if listErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error").SetInternal(listErr)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"upcoming": map[string]any{"items": dashboardTripItems(upcoming)},
		"trips": map[string]any{
			"items":       dashboardTripItems(listed.Trips),
			"next_cursor": listed.NextCursor,
		},
	})
}

func dashboardTripItems(items []trip.Trip) []map[string]any {
	result := make([]map[string]any, 0, len(items))
	for i := range items {
		result = append(result, trip.Response(&items[i]))
	}
	return result
}
