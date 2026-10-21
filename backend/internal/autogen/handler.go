package autogen

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jhontea/navisha/backend/internal/apperr"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/quota"
	"github.com/jhontea/navisha/backend/pkg/sanitize"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
	quota   *quota.Checker

	// Async generation (nil jobs = job routes are not registered).
	jobs       JobStore
	jobTimeout time.Duration
	jobWG      sync.WaitGroup // lets tests wait for background jobs
	now        func() time.Time
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
	if h.jobs != nil {
		// Only the POST is an LLM route (rate bucket, see cmd/server/routes.go);
		// the GETs are cheap polling.
		g.POST("/trips/generate/jobs", middleware.WithUser(h.StartJob), authMiddleware)
		g.GET("/trips/generate/jobs/active", middleware.WithUser(h.ActiveJob), authMiddleware)
		g.GET("/trips/generate/jobs/:id", middleware.WithUser(h.GetJob), authMiddleware)
	}
}

// GetQuota returns the current daily AI quota status.
// GET /api/v1/autogen/quota → { used, limit, remaining, resets_at }
func (h *Handler) GetQuota(c echo.Context, userID string) error {
	return c.JSON(http.StatusOK, h.quota.GetStatus(c, userID))
}

type generateDayRequest struct {
	Instruction string `json:"instruction"`
	Language    string `json:"language"` // "id" (default) | "en"
}

func (h *Handler) GenerateDayPreview(c echo.Context, userID string) error {
	var req generateDayRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	req.Instruction = strings.TrimSpace(sanitize.Text(req.Instruction))
	lang, ok := ParseLanguage(req.Language)
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "language must be id or en")
	}
	input := GenerateDayInput{
		TripID: c.Param("trip_id"), DayID: c.Param("day_id"), Instruction: req.Instruction, Language: lang,
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
	// Language of the generated text: "id" (default) or "en".
	Language string `json:"language"`

	// Optional event-trip context (see GenerateInput).
	Origin        *PlaceInput   `json:"origin"`
	TransportMode string        `json:"transport_mode"`
	Event         *eventRequest `json:"event"`
	Travelers     *Travelers    `json:"travelers"`
	BudgetAmount  float64       `json:"budget_amount"`
	Needs         []string      `json:"needs"`
	DepartTime    string        `json:"depart_time"` // HH:MM, optional
}

type eventRequest struct {
	Name      string     `json:"name"`
	Venue     PlaceInput `json:"venue"`
	Date      string     `json:"date"` // YYYY-MM-DD
	StartTime string     `json:"start_time"`
	EndTime   string     `json:"end_time"`
}

// cleanPlace strips markup from a user place before it reaches the prompt.
func cleanPlace(p *PlaceInput) *PlaceInput {
	if p == nil {
		return nil
	}
	p.Label = strings.TrimSpace(sanitize.Text(p.Label))
	p.Address = strings.TrimSpace(sanitize.Text(p.Address))
	return p
}

func (h *Handler) Generate(c echo.Context, userID string) error {
	input, err := parseGenerateInput(c)
	if err != nil {
		return err
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

	return c.JSON(http.StatusOK, draftToResponse(draft, input.StartDate.Format("2006-01-02"), input.EndDate.Format("2006-01-02")))
}

// parseGenerateInput reads and validates a generate request body. Shared by
// the synchronous endpoint and the job endpoint. The returned error is an
// *echo.HTTPError ready to return.
func parseGenerateInput(c echo.Context) (GenerateInput, error) {
	var req generateRequest
	if err := c.Bind(&req); err != nil {
		return GenerateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	// Strip HTML/scripts from LLM-bound inputs (prompt injection), then run
	// the same checks the usecase runs, so an invalid request never consumes
	// the user's daily AI quota.
	req.Destination = strings.TrimSpace(sanitize.Text(req.Destination))
	req.Description = sanitize.Text(req.Description)
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return GenerateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid start_date (expect YYYY-MM-DD)")
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return GenerateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid end_date (expect YYYY-MM-DD)")
	}
	lang, ok := ParseLanguage(req.Language)
	if !ok {
		return GenerateInput{}, echo.NewHTTPError(http.StatusBadRequest, "language must be id or en")
	}
	input := GenerateInput{
		Language:     lang,
		Destination:  req.Destination,
		Description:  req.Description,
		StartDate:    start,
		EndDate:      end,
		BaseCurrency: req.BaseCurrency,
		TravelStyle:  strings.ToLower(strings.TrimSpace(req.TravelStyle)),

		Origin:        cleanPlace(req.Origin),
		TransportMode: strings.ToLower(strings.TrimSpace(req.TransportMode)),
		Travelers:     req.Travelers,
		BudgetAmount:  req.BudgetAmount,
		Needs:         req.Needs,
		DepartTime:    strings.TrimSpace(req.DepartTime),
	}
	if ev := req.Event; ev != nil {
		date, err := time.Parse("2006-01-02", ev.Date)
		if err != nil {
			return GenerateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid event.date (expect YYYY-MM-DD)")
		}
		input.Event = &EventInput{
			Name:      strings.TrimSpace(sanitize.Text(ev.Name)),
			Venue:     *cleanPlace(&ev.Venue),
			Date:      date,
			StartTime: strings.TrimSpace(ev.StartTime),
			EndTime:   strings.TrimSpace(ev.EndTime),
		}
	}
	if err := ValidateInput(input); err != nil {
		return GenerateInput{}, mapErr(err)
	}
	return input, nil
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
