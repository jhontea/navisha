package summary

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/quota"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
	quota   *quota.Checker
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

// WithQuota wires the shared daily AI quota checker. Summary shares the same
// daily counter as autogen (trip generate, build-around).
func (h *Handler) WithQuota(q *quota.Checker) *Handler {
	h.quota = q
	return h
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/:id/summary", middleware.WithUser(h.Generate), authMiddleware)
	g.GET("/trips/:id/summary", middleware.WithUser(h.Get), authMiddleware)
	g.DELETE("/trips/:id/summary", middleware.WithUser(h.Delete), authMiddleware)
}

func (h *Handler) Generate(c echo.Context, userID string) error {
	tripID := c.Param("id")
	// Optional body {"language": "id" | "en"}; no body keeps Indonesian.
	var req struct {
		Language string `json:"language"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	lang, ok := ParseLanguage(req.Language)
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "language must be id or en")
	}

	// ── Daily quota check (shared with autogen — same counter) ──
	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		return quotaErr
	}

	s, err := h.usecase.Generate(c.Request().Context(), userID, tripID, lang)
	if err != nil {
		// No summary was produced (missing or foreign trip, LLM failure), so
		// the attempt does not count against the daily quota.
		h.quota.Refund(c, userID)
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Get(c echo.Context, userID string) error {
	tripID := c.Param("id")

	s, err := h.usecase.Get(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	if s == nil {
		// No summary generated yet (an unknown trip is still 404).
		return c.NoContent(http.StatusNoContent)
	}
	return c.JSON(http.StatusOK, toResponse(s))
}

func (h *Handler) Delete(c echo.Context, userID string) error {
	tripID := c.Param("id")

	if err := h.usecase.Delete(c.Request().Context(), userID, tripID); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func toResponse(s *Summary) map[string]any {
	return map[string]any{
		"id":                s.ID,
		"trip_id":           s.TripID,
		"content":           s.Content,
		"model":             s.Model,
		"source_updated_at": s.SourceUpdatedAt,
		"is_outdated":       s.IsOutdated,
		"created_at":        s.CreatedAt,
		"updated_at":        s.UpdatedAt,
	}
}

func mapErr(err error) error {
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
