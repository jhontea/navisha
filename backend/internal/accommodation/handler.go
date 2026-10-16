package accommodation

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
	g.GET("/trips/:trip_id/accommodations", middleware.WithUser(h.List), authMiddleware)
	g.POST("/trips/:trip_id/accommodations", middleware.WithUser(h.Create), authMiddleware)
	g.PUT("/accommodations/:id", middleware.WithUser(h.Update), authMiddleware)
	g.DELETE("/accommodations/:id", middleware.WithUser(h.Delete), authMiddleware)
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

// toUpdateCost reads the cost sent with an edit. No cost leaves the linked
// expense alone (older clients); an amount of 0 removes it; a positive
// amount sets it.
func (cr *costRequest) toUpdateCost() (*Cost, *echo.HTTPError) {
	if cr == nil {
		return nil, nil
	}
	if cr.Amount == 0 {
		return &Cost{}, nil
	}
	return cr.toCost()
}

type request struct {
	AccommodationType  string       `json:"accommodation_type"`
	Name               string       `json:"name"`
	LocationName       string       `json:"location_name"`
	Lat                *float64     `json:"lat"`
	Lng                *float64     `json:"lng"`
	GooglePlaceID      string       `json:"google_place_id"`
	CheckIn            string       `json:"check_in"`       // YYYY-MM-DD
	CheckOut           string       `json:"check_out"`      // YYYY-MM-DD
	CheckInTime        string       `json:"check_in_time"`  // HH:MM, optional
	CheckOutTime       string       `json:"check_out_time"` // HH:MM, optional
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
	return CreateInput{
		AccommodationType:  AccommodationType(req.AccommodationType),
		Name:               req.Name,
		LocationName:       req.LocationName,
		Lat:                req.Lat,
		Lng:                req.Lng,
		GooglePlaceID:      req.GooglePlaceID,
		CheckIn:            in,
		CheckOut:           out,
		CheckInTime:        req.CheckInTime,
		CheckOutTime:       req.CheckOutTime,
		ConfirmationNumber: req.ConfirmationNumber,
		Notes:              req.Notes,
	}, nil
}

// validate strips HTML, checks lengths, coordinates and dates, and returns
// the usecase input (without cost).
func (req *request) validate() (CreateInput, *echo.HTTPError) {
	req.Name = strings.TrimSpace(sanitize.Text(req.Name))
	req.Notes = sanitize.Text(req.Notes)
	req.LocationName = sanitize.Text(req.LocationName)
	req.ConfirmationNumber = strings.TrimSpace(sanitize.Text(req.ConfirmationNumber))
	switch {
	case req.Name == "":
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "name is required")
	case sanitize.TooLong(req.Name, 200):
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "name must be 200 characters or less")
	case sanitize.TooLong(req.LocationName, 300):
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "location must be 300 characters or less")
	case sanitize.TooLong(req.ConfirmationNumber, 120):
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "confirmation number must be 120 characters or less")
	case sanitize.TooLong(req.Notes, 5000):
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "notes are too long")
	case req.Lat != nil && (*req.Lat < -90 || *req.Lat > 90), req.Lng != nil && (*req.Lng < -180 || *req.Lng > 180):
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid coordinates")
	}
	req.CheckInTime = strings.TrimSpace(req.CheckInTime)
	req.CheckOutTime = strings.TrimSpace(req.CheckOutTime)
	if !validClock(req.CheckInTime) || !validClock(req.CheckOutTime) {
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid time (expect HH:MM)")
	}
	in, err := req.toInput()
	if err != nil {
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "invalid date (expect YYYY-MM-DD)")
	}
	// Same-day stays (day use) are allowed, as in the form and the usecase.
	if in.CheckOut.Before(in.CheckIn) {
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "check-out must be on or after check-in")
	}
	if in.CheckOut.Equal(in.CheckIn) && in.CheckInTime != "" && in.CheckOutTime != "" && in.CheckOutTime < in.CheckInTime {
		return CreateInput{}, echo.NewHTTPError(http.StatusBadRequest, "check-out must be after check-in")
	}
	return in, nil
}

// validClock accepts "" (not set) or a 24-hour "HH:MM".
func validClock(v string) bool {
	if v == "" {
		return true
	}
	_, err := time.Parse("15:04", v)
	return err == nil && len(v) == 5
}

// nullableClock renders an unset time as JSON null.
func nullableClock(v string) any {
	if v == "" {
		return nil
	}
	return v
}

func (h *Handler) List(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, a := range items {
		resp = append(resp, toResponse(&a))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *Handler) Create(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	in, herr := req.validate()
	if herr != nil {
		return herr
	}
	cost, herr := req.Cost.toCost()
	if herr != nil {
		return herr
	}
	in.Cost = cost
	a, err := h.usecase.Create(c.Request().Context(), userID, tripID, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(a))
}

func (h *Handler) Update(c echo.Context, userID string) error {
	id := c.Param("id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	in, herr := req.validate()
	if herr != nil {
		return herr
	}
	cost, herr := req.Cost.toUpdateCost()
	if herr != nil {
		return herr
	}
	in.Cost = cost
	a, err := h.usecase.Update(c.Request().Context(), userID, id, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(a))
}

func (h *Handler) Delete(c echo.Context, userID string) error {
	id := c.Param("id")
	if err := h.usecase.Delete(c.Request().Context(), userID, id); err != nil {
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
		"check_in_time":       nullableClock(a.CheckInTime),
		"check_out_time":      nullableClock(a.CheckOutTime),
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
		apperr.HTTPMapping{Err: apperr.ErrUnsupportedCurrency, Code: http.StatusBadRequest, Message: "unsupported cost currency"},
		apperr.HTTPMapping{Err: apperr.ErrRatesUnavailable, Code: http.StatusServiceUnavailable, Message: "Couldn't fetch exchange rates for the cost. Try again in a moment."},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
