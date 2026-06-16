package accommodation

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
	g.GET("/trips/:trip_id/accommodations", h.List, authMiddleware)
	g.POST("/trips/:trip_id/accommodations", h.Create, authMiddleware)
	g.PUT("/accommodations/:id", h.Update, authMiddleware)
	g.DELETE("/accommodations/:id", h.Delete, authMiddleware)
}

type request struct {
	Name               string   `json:"name"`
	LocationName       string   `json:"location_name"`
	Lat                *float64 `json:"lat"`
	Lng                *float64 `json:"lng"`
	GooglePlaceID      string   `json:"google_place_id"`
	CheckIn            string   `json:"check_in"`  // YYYY-MM-DD
	CheckOut           string   `json:"check_out"` // YYYY-MM-DD
	ConfirmationNumber string   `json:"confirmation_number"`
	Notes              string   `json:"notes"`
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
		Name:               req.Name,
		LocationName:       req.LocationName,
		Lat:                req.Lat,
		Lng:                req.Lng,
		GooglePlaceID:      req.GooglePlaceID,
		CheckIn:            in,
		CheckOut:           out,
		ConfirmationNumber: req.ConfirmationNumber,
		Notes:              req.Notes,
	}, nil
}

func (h *Handler) List(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
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
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	var req request
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	in, err := req.toInput()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date (expect YYYY-MM-DD)")
	}
	a, err := h.usecase.Create(userID, tripID, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(a))
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
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date (expect YYYY-MM-DD)")
	}
	a, err := h.usecase.Update(userID, id, in)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(a))
}

func (h *Handler) Delete(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
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
	switch {
	case errors.Is(err, ErrNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "accommodation not found")
	case errors.Is(err, ErrTripNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "trip not found")
	case errors.Is(err, ErrInvalidName):
		return echo.NewHTTPError(http.StatusBadRequest, "name required")
	case errors.Is(err, ErrInvalidDates):
		return echo.NewHTTPError(http.StatusBadRequest, "invalid dates: check_out must be on or after check_in")
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
