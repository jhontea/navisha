package calendarexport

import (
	"errors"
	"log"
	"net/http"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:id/calendar-export", h.Status, authMiddleware)
	g.POST("/trips/:id/calendar-export", h.Export, authMiddleware)
	g.DELETE("/trips/:id/calendar-export", h.Remove, authMiddleware)
}

// Status reports how many events are currently exported for the trip, so the
// frontend can show/hide the Remove action.
func (h *Handler) Status(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	count, err := h.usecase.Status(userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"exported_count": count,
	})
}

// Export syncs the trip's location activities to Google Calendar: new activities
// are added, activities removed since the last export are pruned.
func (h *Handler) Export(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	res, err := h.usecase.ExportTrip(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"created": res.Created,
		"removed": res.Removed,
		"total":   res.Total,
		"message": "Trip activities synced to Google Calendar",
	})
}

// Remove deletes all Google Calendar events exported for the trip.
func (h *Handler) Remove(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	if err := h.usecase.RemoveTrip(c.Request().Context(), userID, tripID); err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Trip events removed from Google Calendar",
	})
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, ErrReauthRequired):
		// User must re-authorize Google (no/expired/revoked token, or missing
		// Calendar scope). Frontend prompts a re-login on this code.
		return echo.NewHTTPError(http.StatusUnauthorized, map[string]any{
			"code":    "GOOGLE_REAUTH_REQUIRED",
			"message": "Please sign in again to grant Google Calendar access.",
		})
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "you do not own this trip")
	default:
		log.Printf("calendarexport: internal error: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "calendar export failed")
	}
}
