package transportation

import (
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/pkg/sanitize"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	usecase UsecaseInterface
}

func NewHandler(usecase UsecaseInterface) *Handler {
	return &Handler{usecase: usecase}
}

func (h *Handler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/transportations", middleware.WithUser(h.List), authMiddleware)
	g.POST("/trips/:trip_id/transportations", middleware.WithUser(h.Create), authMiddleware)
	g.PUT("/transportations/:id", middleware.WithUser(h.Update), authMiddleware)
	g.DELETE("/transportations/:id", middleware.WithUser(h.Delete), authMiddleware)
}

type costRequest struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

// toCost validates the optional cost that creates a linked expense. A missing
// cost or an amount of 0 means none; a negative or non-finite amount, or an
// amount without a currency, is rejected rather than silently dropped.
func (cr *costRequest) toCost() (*Cost, *echo.HTTPError) {
	if cr == nil || cr.Amount == 0 {
		return nil, nil
	}
	if cr.Amount < 0 || math.IsNaN(cr.Amount) || math.IsInf(cr.Amount, 0) {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "cost amount must be greater than 0")
	}
	currency := strings.ToUpper(strings.TrimSpace(cr.Currency))
	if currency == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "cost currency is required")
	}
	return &Cost{Amount: cr.Amount, Currency: currency}, nil
}

type request struct {
	Type              string       `json:"type"`
	Label             string       `json:"label"`
	Operator          string       `json:"operator"`
	ReferenceNumber   string       `json:"reference_number"`
	FromLocation      string       `json:"from_location"`
	ToLocation        string       `json:"to_location"`
	DepartureDatetime *string      `json:"departure_datetime"` // RFC3339 or empty
	ArrivalDatetime   *string      `json:"arrival_datetime"`
	Notes             string       `json:"notes"`
	Cost              *costRequest `json:"cost"` // optional auto-expense
}

func (req *request) toInput() (CreateInput, error) {
	dep, err := parseOptTime(req.DepartureDatetime)
	if err != nil {
		return CreateInput{}, err
	}
	arr, err := parseOptTime(req.ArrivalDatetime)
	if err != nil {
		return CreateInput{}, err
	}
	return CreateInput{
		Type:              Type(req.Type),
		Label:             req.Label,
		Operator:          req.Operator,
		ReferenceNumber:   req.ReferenceNumber,
		FromLocation:      req.FromLocation,
		ToLocation:        req.ToLocation,
		DepartureDatetime: dep,
		ArrivalDatetime:   arr,
		Notes:             req.Notes,
	}, nil
}

func parseOptTime(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (h *Handler) List(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, t := range items {
		resp = append(resp, toResponse(&t))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

// clean strips HTML from the text fields, then checks the required ones, so a
// value made only of tags counts as empty.
func (req *request) clean() *echo.HTTPError {
	req.FromLocation = strings.TrimSpace(sanitize.Text(req.FromLocation))
	req.ToLocation = strings.TrimSpace(sanitize.Text(req.ToLocation))
	req.Notes = sanitize.Text(req.Notes)
	req.Label = sanitize.Text(req.Label)
	if req.FromLocation == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "from_location is required")
	}
	if req.ToLocation == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "to_location is required")
	}
	req.Operator = sanitize.Text(req.Operator)
	req.ReferenceNumber = sanitize.Text(req.ReferenceNumber)
	switch {
	case sanitize.TooLong(req.FromLocation, 200), sanitize.TooLong(req.ToLocation, 200):
		return echo.NewHTTPError(http.StatusBadRequest, "locations must be 200 characters or less")
	case sanitize.TooLong(req.Label, 120), sanitize.TooLong(req.Operator, 120), sanitize.TooLong(req.ReferenceNumber, 120):
		return echo.NewHTTPError(http.StatusBadRequest, "label, operator and reference must be 120 characters or less")
	case sanitize.TooLong(req.Notes, 5000):
		return echo.NewHTTPError(http.StatusBadRequest, "notes are too long")
	}
	return nil
}

func (h *Handler) Create(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if err := req.clean(); err != nil {
		return err
	}
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid datetime (expect RFC3339)")
	}
	cost, herr := req.Cost.toCost()
	if herr != nil {
		return herr
	}
	in.Cost = cost
	t, err := h.usecase.Create(c.Request().Context(), userID, tripID, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(t))
}

func (h *Handler) Update(c echo.Context, userID string) error {
	id := c.Param("id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if err := req.clean(); err != nil {
		return err
	}
	// A cost only creates the linked expense on Create; after that the
	// expense is edited on the Budget tab, so Update ignores it.
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid datetime (expect RFC3339)")
	}
	t, err := h.usecase.Update(c.Request().Context(), userID, id, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(t))
}

func (h *Handler) Delete(c echo.Context, userID string) error {
	id := c.Param("id")
	if err := h.usecase.Delete(c.Request().Context(), userID, id); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

// formatTimeUTC returns an RFC3339 string in UTC, or nil if t is nil.
// We always serialize datetimes as UTC so the frontend can extract the
// literal HH:MM digits (e.g. "06:30" from "T06:30:00Z") without any
// timezone conversion. The pgx driver returns TIMESTAMPTZ in the server's
// local timezone (+07:00) which would shift the displayed time.
func formatTimeUTC(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}

func toResponse(t *Transportation) map[string]any {
	return map[string]any{
		"id":                 t.ID,
		"trip_id":            t.TripID,
		"type":               string(t.Type),
		"label":              t.Label,
		"operator":           t.Operator,
		"reference_number":   t.ReferenceNumber,
		"from_location":      t.FromLocation,
		"to_location":        t.ToLocation,
		"departure_datetime": formatTimeUTC(t.DepartureDatetime),
		"arrival_datetime":   formatTimeUTC(t.ArrivalDatetime),
		"notes":              t.Notes,
		"created_at":         t.CreatedAt,
		"updated_at":         t.UpdatedAt,
	}
}

func mapErr(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrNotFound, Code: http.StatusNotFound, Message: "transportation not found"},
		apperr.HTTPMapping{Err: ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: ErrArrivalBeforeDeparture, Code: http.StatusBadRequest, Message: "arrival must be after departure"},
		apperr.HTTPMapping{Err: ErrInvalidType, Code: http.StatusBadRequest, Message: "invalid type (expect flight|bus|train|ferry|ship|car|other)"},
		apperr.HTTPMapping{Err: apperr.ErrUnsupportedCurrency, Code: http.StatusBadRequest, Message: "unsupported cost currency"},
		apperr.HTTPMapping{Err: apperr.ErrRatesUnavailable, Code: http.StatusServiceUnavailable, Message: "Couldn't fetch exchange rates for the cost. Try again in a moment."},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
