package bookingparse

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/quota"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
)

type tripGetter interface {
	Get(ctx context.Context, userID, tripID string) (*trip.Trip, []trip.Day, error)
}

type Handler struct {
	trips tripGetter
	llm   chatClient
	model string
	quota *quota.Checker
}

func NewHandler(trips tripGetter, llm chatClient, model string) *Handler {
	return &Handler{trips: trips, llm: llm, model: model}
}

// WithQuota wires the shared daily AI quota (same counter as summary/autogen).
func (h *Handler) WithQuota(q *quota.Checker) *Handler {
	h.quota = q
	return h
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/:id/bookings/parse", middleware.WithUser(h.Parse), authMiddleware)
}

// Parse reads the bookings in a pasted confirmation text. The text is sent
// to the AI provider only; it is never stored or logged.
func (h *Handler) Parse(c echo.Context, userID string) error {
	var req struct {
		Text string `json:"text"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "text is required")
	}
	chars := utf8.RuneCountInString(text)
	if chars > MaxTextChars {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("text must be %d characters or less", MaxTextChars))
	}

	ctx := c.Request().Context()
	t, _, err := h.trips.Get(ctx, userID, c.Param("id"))
	if err != nil {
		return trip.MapError(err)
	}

	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		return quotaErr
	}
	bookings, err := Parse(ctx, h.llm, h.model, text, TripContext{Title: t.Title, StartDate: t.StartDate, EndDate: t.EndDate})
	if err != nil {
		// Parse fails only when the model call or its reply is unusable.
		h.quota.Refund(c, userID)
		slog.Error("bookingparse: llm failed", "error", err)
		return echo.NewHTTPError(http.StatusServiceUnavailable, map[string]any{
			"code":    "LLM_UNAVAILABLE",
			"message": "Couldn't read this text right now. Please try again in a moment.",
		})
	}
	// Counts only: the text and the model reply stay out of the logs.
	slog.Info("bookingparse: parsed", "chars", chars, "bookings", len(bookings))
	return c.JSON(http.StatusOK, map[string]any{"bookings": bookings})
}
