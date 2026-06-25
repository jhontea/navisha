package autogen

import (
	"errors"
	"log"
	"net/http"
	"time"

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
	var req generateRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
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
		log.Printf("autogen: internal error: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
