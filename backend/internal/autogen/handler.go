package autogen

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/pkg/sanitize"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	usecase              UsecaseInterface
	rdb                  *redis.Client
	generateRateLimitSec int
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

// WithGenerateRateLimit enables per-user cooldown for AI trip generation.
// Pass rdb=nil or seconds=0 to disable.
func (h *Handler) WithGenerateRateLimit(rdb *redis.Client, seconds int) *Handler {
	h.rdb = rdb
	h.generateRateLimitSec = seconds
	return h
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/generate", h.Generate, authMiddleware)
	g.POST("/trips/from-draft", h.CreateFromDraft, authMiddleware)
}

type generateRequest struct {
	Destination  string `json:"destination"`
	Description  string `json:"description"`
	StartDate    string `json:"start_date"` // YYYY-MM-DD
	EndDate      string `json:"end_date"`
	BaseCurrency string `json:"base_currency"`
}

func (h *Handler) Generate(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)

	// ── Per-user cooldown (Redis SETNX — atomic check-and-reserve) ──
	// SETNX ensures the check and reservation happen as a single atomic op.
	// This prevents the classic race where two concurrent requests both pass
	// a TTL check before either manages to set the cooldown key.
	if h.rdb != nil && h.generateRateLimitSec > 0 {
		key := fmt.Sprintf("ratelimit:autogen:cooldown:%s", userID)
		dur := time.Duration(h.generateRateLimitSec) * time.Second
		ok, err := h.rdb.SetNX(c.Request().Context(), key, "1", dur).Result()
		if err != nil {
			slog.Warn("autogen: cooldown check failed", "user_id", userID, "err", err)
		} else if !ok {
			ttl, _ := h.rdb.TTL(c.Request().Context(), key).Result()
			retryAfter := int(ttl.Seconds())
			if retryAfter <= 0 {
				retryAfter = h.generateRateLimitSec
			}
			return echo.NewHTTPError(http.StatusTooManyRequests, map[string]any{
				"code":                "RATE_LIMITED",
				"message":             fmt.Sprintf("Trip generation cooldown. Try again in %d seconds.", retryAfter),
				"retry_after_seconds": retryAfter,
			})
		}
	}

	var req generateRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	// Loop 34: validate required fields before hitting LLM.
	if strings.TrimSpace(req.Destination) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "destination is required")
	}
	if len(req.Destination) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "destination must be 200 characters or less")
	}
	if len(req.Description) > 2000 {
		return echo.NewHTTPError(http.StatusBadRequest, "description is too long")
	}
	// Loop 35: strip HTML/scripts from LLM-bound inputs to prevent prompt injection.
	req.Destination = sanitize.Text(req.Destination)
	req.Description = sanitize.Text(req.Description)
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid start_date (expect YYYY-MM-DD)")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid end_date (expect YYYY-MM-DD)")
	}

	draft, err := h.usecase.GenerateDraft(c.Request().Context(), userID, GenerateInput{
		Destination:  req.Destination,
		Description:  req.Description,
		StartDate:    start,
		EndDate:      end,
		BaseCurrency: req.BaseCurrency,
	})
	if err != nil {
		return mapErr(err)
	}

	// Cooldown was already reserved at the top of Generate via SETNX.
	// No need to set it again here.

	return c.JSON(http.StatusOK, draftToResponse(draft, req.StartDate, req.EndDate))
}

type fromDraftRequest struct {
	StartDate     string    `json:"start_date"`
	EndDate       string    `json:"end_date"`
	Draft         TripDraft `json:"draft"`
	CoverImageURL string    `json:"cover_image_url"`
	Description   string    `json:"description"`
}

func (h *Handler) CreateFromDraft(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	var req fromDraftRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if _, err := time.Parse("2006-01-02", req.StartDate); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid start_date (expect YYYY-MM-DD)")
	}
	if _, err := time.Parse("2006-01-02", req.EndDate); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid end_date (expect YYYY-MM-DD)")
	}

	tripID, err := h.usecase.CreateFromDraft(c.Request().Context(), userID, req.Draft, req.StartDate, req.EndDate, req.CoverImageURL, req.Description)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, map[string]any{"trip_id": tripID})
}

// draftToResponse serializes the draft plus the dates the client should echo
// back when creating the trip. estimated_tokens is included for cost-awareness.
func draftToResponse(d *TripDraft, startDate, endDate string) map[string]any {
	return map[string]any{
		"start_date": startDate,
		"end_date":   endDate,
		"draft":      d,
	}
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, ErrInvalidInput):
		return echo.NewHTTPError(http.StatusUnprocessableEntity, map[string]any{
			"code":    "INVALID_INPUT",
			"message": err.Error(),
		})
	case errors.Is(err, ErrInvalidPrompt):
		return echo.NewHTTPError(http.StatusUnprocessableEntity, map[string]any{
			"code":    "INVALID_PROMPT",
			"message": "Permintaan tidak menggambarkan perjalanan yang valid. Coba jelaskan tujuan perjalananmu.",
		})
	case errors.Is(err, ErrLLMUnavailable):
		return echo.NewHTTPError(http.StatusServiceUnavailable, map[string]any{
			"code":    "LLM_UNAVAILABLE",
			"message": "Gagal membuat itinerary saat ini. Silakan coba lagi sebentar lagi.",
		})
	default:
		slog.Error("autogen: internal error", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
