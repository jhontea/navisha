package transportation

import (
	"errors"
	"net/http"
	"time"

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
	g.GET("/trips/:trip_id/transportations", h.List, authMiddleware)
	g.POST("/trips/:trip_id/transportations", h.Create, authMiddleware)
	g.PUT("/transportations/:id", h.Update, authMiddleware)
	g.DELETE("/transportations/:id", h.Delete, authMiddleware)
}

type costRequest struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
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
	var cost *Cost
	if req.Cost != nil && req.Cost.Amount > 0 && req.Cost.Currency != "" {
		cost = &Cost{Amount: req.Cost.Amount, Currency: req.Cost.Currency}
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
		Cost:              cost,
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

func (h *Handler) List(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, t := range items {
		resp = append(resp, toResponse(&t))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *Handler) Create(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid datetime (expect RFC3339)")
	}
	t, err := h.usecase.Create(c.Request().Context(), userID, tripID, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(t))
}

func (h *Handler) Update(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	id := c.Param("id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid datetime (expect RFC3339)")
	}
	t, err := h.usecase.Update(userID, id, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(t))
}

func (h *Handler) Delete(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	id := c.Param("id")
	if err := h.usecase.Delete(userID, id); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
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
		"departure_datetime": t.DepartureDatetime,
		"arrival_datetime":   t.ArrivalDatetime,
		"notes":              t.Notes,
		"created_at":         t.CreatedAt,
		"updated_at":         t.UpdatedAt,
	}
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "transportation not found")
	case errors.Is(err, ErrTripNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "trip not found")
	case errors.Is(err, ErrInvalidType):
		return echo.NewHTTPError(http.StatusBadRequest, "invalid type (expect flight|bus|train|ferry|ship|car|other)")
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
