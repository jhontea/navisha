package summary

import (
	"errors"
	"log/slog"
	"math"
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
	g.POST("/trips/:id/summary", h.Generate, authMiddleware)
	g.GET("/trips/:id/summary", h.Get, authMiddleware)
	g.DELETE("/trips/:id/summary", h.Delete, authMiddleware)
}

func (h *Handler) Generate(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	s, err := h.usecase.Generate(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Get(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	s, err := h.usecase.Get(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Delete(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	if err := h.usecase.Delete(c.Request().Context(), userID, tripID); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func toResponse(s *Summary) map[string]any {
	return map[string]any{
		"id":         s.ID,
		"trip_id":    s.TripID,
		"content":    s.Content,
		"model":      s.Model,
		"created_at": s.CreatedAt,
		"updated_at": s.UpdatedAt,
	}
}

func mapErr(err error) error {
	var rl *RateLimitError
	if errors.As(err, &rl) {
		retryAfter := int(math.Ceil(rl.RetryAfter.Seconds()))
		return echo.NewHTTPError(http.StatusTooManyRequests, map[string]any{
			"code":                "RATE_LIMITED",
			"message":             "summary was generated recently, try again later",
			"retry_after_seconds": retryAfter,
		})
	}
	switch {
	case errors.Is(err, ErrNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "summary not found")
	case errors.Is(err, ErrForbidden), errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	case errors.Is(err, ErrLLMUnavailable):
		// Transient LLM failure (timeout, client disconnect, upstream error).
		// 503 lets the frontend show a clear "try again" message rather than
		// a generic server error. The full cause is already logged in the usecase.
		return echo.NewHTTPError(http.StatusServiceUnavailable, map[string]any{
			"code":    "LLM_UNAVAILABLE",
			"message": "Couldn't generate the summary right now. Please try again in a moment.",
		})
	default:
		slog.Error("summary: internal error", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
