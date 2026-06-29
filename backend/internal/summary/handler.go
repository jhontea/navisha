package summary

import (
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	usecase      UsecaseInterface
	rdb          *redis.Client
	rateLimitSec int
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

// WithSummaryRateLimit enables per-user cooldown for summary generation.
// Uses Redis SETNX for atomic check-and-reserve. Pass rdb=nil or seconds=0 to disable.
func (h *Handler) WithSummaryRateLimit(rdb *redis.Client, seconds int) *Handler {
	h.rdb = rdb
	h.rateLimitSec = seconds
	return h
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/:id/summary", h.Generate, authMiddleware)
	g.GET("/trips/:id/summary", h.Get, authMiddleware)
	g.DELETE("/trips/:id/summary", h.Delete, authMiddleware)
}

func (h *Handler) Generate(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	tripID := c.Param("id")

	// ── Per-user cooldown (Redis SETNX — same pattern as autogen) ──
	if h.rdb != nil && h.rateLimitSec > 0 {
		key := fmt.Sprintf("ratelimit:summary:cooldown:%s", userID)
		dur := time.Duration(h.rateLimitSec) * time.Second
		ok, err := h.rdb.SetNX(c.Request().Context(), key, "1", dur).Result()
		if err != nil {
			slog.Warn("summary: cooldown check failed", "user_id", userID, "err", err)
		} else if !ok {
			ttl, _ := h.rdb.TTL(c.Request().Context(), key).Result()
			retryAfter := int(ttl.Seconds())
			if retryAfter <= 0 {
				retryAfter = h.rateLimitSec
			}
			return echo.NewHTTPError(http.StatusTooManyRequests, map[string]any{
				"code":                "RATE_LIMITED",
				"message":             fmt.Sprintf("Summary generation cooldown. Try again in %d seconds.", retryAfter),
				"retry_after_seconds": retryAfter,
			})
		}
	}

	s, err := h.usecase.Generate(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Get(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	tripID := c.Param("id")

	s, err := h.usecase.Get(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Delete(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
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
