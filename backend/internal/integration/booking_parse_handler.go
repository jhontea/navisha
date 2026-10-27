package integration

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

type bookingParseTrips interface {
	Get(ctx context.Context, userID, tripID string) (*trip.Trip, []trip.Day, error)
}

type BookingParseHandler struct {
	trips bookingParseTrips
	llm   bookingParseLLM
	model string
	quota *quota.Checker
}

func NewBookingParseHandler(trips bookingParseTrips, llm bookingParseLLM, model string) *BookingParseHandler {
	return &BookingParseHandler{trips: trips, llm: llm, model: model}
}

// WithQuota wires the shared daily AI quota (same counter as summary/autogen).
func (h *BookingParseHandler) WithQuota(q *quota.Checker) *BookingParseHandler {
	h.quota = q
	return h
}

func (h *BookingParseHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/:id/bookings/parse", middleware.WithUser(h.Parse), authMiddleware)
}

// Parse reads the bookings in a pasted confirmation text. The text is sent
// to the AI provider only; it is never stored or logged.
func (h *BookingParseHandler) Parse(c echo.Context, userID string) error {
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
	if chars > BookingParseMaxChars {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("text must be %d characters or less", BookingParseMaxChars))
	}

	ctx := c.Request().Context()
	t, _, err := h.trips.Get(ctx, userID, c.Param("id"))
	if err != nil {
		return trip.MapError(err)
	}

	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		return quotaErr
	}
	bookings, err := ParseBookings(ctx, h.llm, h.model, text, BookingParseTrip{Title: t.Title, StartDate: t.StartDate, EndDate: t.EndDate})
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
