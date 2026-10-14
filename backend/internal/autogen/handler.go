package autogen

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/quota"
	"github.com/ahmadhafizh/navisha/backend/pkg/sanitize"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
	quota   *quota.Checker
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

// WithQuota wires the shared daily AI quota checker (autogen + summary share
// one counter). Pass a nil Checker to disable.
func (h *Handler) WithQuota(q *quota.Checker) *Handler {
	h.quota = q
	return h
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/trips/generate", middleware.WithUser(h.Generate), authMiddleware)
	g.POST("/trips/from-draft", middleware.WithUser(h.CreateFromDraft), authMiddleware)
	g.POST("/trips/:trip_id/days/:day_id/generate-preview", middleware.WithUser(h.GenerateDayPreview), authMiddleware)
	g.GET("/autogen/quota", middleware.WithUser(h.GetQuota), authMiddleware)
}

// GetQuota returns the current daily AI quota status.
// GET /api/v1/autogen/quota → { used, limit, remaining, resets_at }
func (h *Handler) GetQuota(c echo.Context, userID string) error {
	return c.JSON(http.StatusOK, h.quota.GetStatus(c, userID))
}

type generateDayRequest struct {
	Instruction string `json:"instruction"`
}

func (h *Handler) GenerateDayPreview(c echo.Context, userID string) error {
	var req generateDayRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	req.Instruction = strings.TrimSpace(sanitize.Text(req.Instruction))
	input := GenerateDayInput{
		TripID: c.Param("trip_id"), DayID: c.Param("day_id"), Instruction: req.Instruction,
	}
	if err := ValidateDayInput(input); err != nil {
		return mapErr(err)
	}

	// ── Daily quota check (shared across all AI endpoints) ──
	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		return quotaErr
	}

	preview, err := h.usecase.GenerateDayPreview(c.Request().Context(), userID, input)
	if err != nil {
		if refundable(err) {
			h.quota.Refund(c, userID)
		}
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, preview)
}

type generateRequest struct {
	Destination  string `json:"destination"`
	Description  string `json:"description"`
	StartDate    string `json:"start_date"` // YYYY-MM-DD
	EndDate      string `json:"end_date"`
	BaseCurrency string `json:"base_currency"`
	// TravelStyle picks a style block in the prompt; empty means balanced.
	TravelStyle string `json:"travel_style"`
}

func (h *Handler) Generate(c echo.Context, userID string) error {
	var req generateRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	// Strip HTML/scripts from LLM-bound inputs (prompt injection), then run
	// the same checks the usecase runs, so an invalid request never consumes
	// the user's daily AI quota.
	req.Destination = strings.TrimSpace(sanitize.Text(req.Destination))
	req.Description = sanitize.Text(req.Description)
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid start_date (expect YYYY-MM-DD)")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid end_date (expect YYYY-MM-DD)")
	}
	input := GenerateInput{
		Destination:  req.Destination,
		Description:  req.Description,
		StartDate:    start,
		EndDate:      end,
		BaseCurrency: req.BaseCurrency,
		TravelStyle:  strings.ToLower(strings.TrimSpace(req.TravelStyle)),
	}
	if err := ValidateInput(input); err != nil {
		return mapErr(err)
	}

	// Daily quota check (shared across all AI endpoints).
	if quotaErr := h.quota.Consume(c, userID); quotaErr != nil {
		return quotaErr
	}

	draft, err := h.usecase.GenerateDraft(c.Request().Context(), userID, input)
	if err != nil {
		if refundable(err) {
			h.quota.Refund(c, userID)
		}
		return mapErr(err)
	}

	return c.JSON(http.StatusOK, draftToResponse(draft, req.StartDate, req.EndDate))
}

type fromDraftRequest struct {
	StartDate     string    `json:"start_date"`
	EndDate       string    `json:"end_date"`
	Draft         TripDraft `json:"draft"`
	CoverImageURL string    `json:"cover_image_url"`
	Description   string    `json:"description"`
}

func (h *Handler) CreateFromDraft(c echo.Context, userID string) error {
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
	case errors.Is(err, ErrDayNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "trip day not found")
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	default:
		slog.Error("autogen: internal error", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}

// refundable reports whether a failed AI request gives its quota back. Only a
// model that answered but declined the prompt (ErrInvalidPrompt) keeps it;
// everything else (trip or day not found, forbidden, LLM failure) produced
// nothing the user can use.
func refundable(err error) bool {
	return !errors.Is(err, ErrInvalidPrompt)
}
