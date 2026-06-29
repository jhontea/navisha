package accommodation

import (
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
	g.GET("/trips/:trip_id/accommodations", h.List, authMiddleware)
	g.POST("/trips/:trip_id/accommodations", h.Create, authMiddleware)
	g.PUT("/accommodations/:id", h.Update, authMiddleware)
	g.DELETE("/accommodations/:id", h.Delete, authMiddleware)
}

type costRequest struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

type request struct {
	AccommodationType  string       `json:"accommodation_type"`
	Name               string       `json:"name"`
	LocationName       string       `json:"location_name"`
	Lat                *float64     `json:"lat"`
	Lng                *float64     `json:"lng"`
	GooglePlaceID      string       `json:"google_place_id"`
	CheckIn            string       `json:"check_in"`  // YYYY-MM-DD
	CheckOut           string       `json:"check_out"` // YYYY-MM-DD
	ConfirmationNumber string       `json:"confirmation_number"`
	Notes              string       `json:"notes"`
	Cost               *costRequest `json:"cost"`
}

func (req *request) toInput() (CreateInput, error) {
	in, err := time.Parse("2006-01-02", req.CheckIn)
	if err != nil {
		return CreateInput{}, err
	}
	out, err := time.Parse("2006-01-02", req.CheckOut)
	if err != nil {
		return CreateInput{}, err
	}
	var cost *Cost
	if req.Cost != nil && req.Cost.Amount > 0 && req.Cost.Currency != "" {
		cost = &Cost{Amount: req.Cost.Amount, Currency: req.Cost.Currency}
	}
	return CreateInput{
		AccommodationType:  AccommodationType(req.AccommodationType),
		Name:               req.Name,
		LocationName:       req.LocationName,
		Lat:                req.Lat,
		Lng:                req.Lng,
		GooglePlaceID:      req.GooglePlaceID,
		CheckIn:            in,
		CheckOut:           out,
		ConfirmationNumber: req.ConfirmationNumber,
		Notes:              req.Notes,
		Cost:               cost,
	}, nil
}

func (h *Handler) List(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, a := range items {
		resp = append(resp, toResponse(&a))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *Handler) Create(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	tripID := c.Param("trip_id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	// Loop 16: early validation before parsing dates.
	if strings.TrimSpace(req.Name) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}
	if len(req.Name) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "name must be 200 characters or less")
	}
	req.Name = sanitize.Text(req.Name)
	req.Notes = sanitize.Text(req.Notes)
	req.LocationName = sanitize.Text(req.LocationName)
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date (expect YYYY-MM-DD)")
	}
	// Validate check-in before check-out.
	if !in.CheckOut.After(in.CheckIn) {
		return echo.NewHTTPError(http.StatusBadRequest, "check-out must be after check-in")
	}
	a, err := h.usecase.Create(c.Request().Context(), userID, tripID, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(a))
}

func (h *Handler) Update(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	id := c.Param("id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if strings.TrimSpace(req.Name) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}
	if len(req.Name) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "name must be 200 characters or less")
	}
	req.Name = sanitize.Text(req.Name)
	req.Notes = sanitize.Text(req.Notes)
	req.LocationName = sanitize.Text(req.LocationName)
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date (expect YYYY-MM-DD)")
	}
	if !in.CheckOut.After(in.CheckIn) {
		return echo.NewHTTPError(http.StatusBadRequest, "check-out must be after check-in")
	}
	a, err := h.usecase.Update(userID, id, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(a))
}

func (h *Handler) Delete(c echo.Context) error {
	userID, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	id := c.Param("id")
	if err := h.usecase.Delete(userID, id); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func toResponse(a *Accommodation) map[string]any {
	return map[string]any{
		"id":                  a.ID,
		"trip_id":             a.TripID,
		"accommodation_type":  string(a.AccommodationType),
		"name":                a.Name,
		"location_name":       a.LocationName,
		"lat":                 a.Lat,
		"lng":                 a.Lng,
		"google_place_id":     a.GooglePlaceID,
		"check_in":            a.CheckIn.Format("2006-01-02"),
		"check_out":           a.CheckOut.Format("2006-01-02"),
		"confirmation_number": a.ConfirmationNumber,
		"notes":               a.Notes,
		"created_at":          a.CreatedAt,
		"updated_at":          a.UpdatedAt,
	}
}

func mapErr(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrNotFound, Code: http.StatusNotFound, Message: "accommodation not found"},
		apperr.HTTPMapping{Err: ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: ErrInvalidName, Code: http.StatusBadRequest, Message: "name required"},
		apperr.HTTPMapping{Err: ErrInvalidDates, Code: http.StatusBadRequest, Message: "invalid dates: check_out must be on or after check_in"},
		apperr.HTTPMapping{Err: ErrInvalidType, Code: http.StatusBadRequest, Message: "invalid accommodation type: must be hotel, hostel, apartment, or other"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
