package trip

import (
	"errors"
	"net/http"
	"strconv"
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
	g.GET("/trips", h.List, authMiddleware)
	g.GET("/trips/filter", h.ListFiltered, authMiddleware)
	g.GET("/trips/upcoming", h.ListUpcoming, authMiddleware)
	g.POST("/trips", h.Create, authMiddleware)
	g.GET("/trips/:id", h.Get, authMiddleware)
	g.PUT("/trips/:id", h.Update, authMiddleware)
	g.DELETE("/trips/:id", h.Delete, authMiddleware)
	g.PUT("/days/:day_id/notes", h.UpdateDayNotes, authMiddleware)
}

type tripRequest struct {
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	StartDate     string   `json:"start_date"` // YYYY-MM-DD
	EndDate       string   `json:"end_date"`
	BaseCurrency  string   `json:"base_currency"`
	Budget        *float64 `json:"budget"` // optional, 0 = no budget set
	CoverImageURL string   `json:"cover_image_url"`
	Notes         string   `json:"notes"`
}

func (h *Handler) Create(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	var req tripRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	start, end, err := parseDates(req.StartDate, req.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date format (expect YYYY-MM-DD)")
	}

	var budget float64
	if req.Budget != nil {
		budget = *req.Budget
	}
	t, err := h.usecase.Create(c.Request().Context(), userID, CreateInput{
		Title:         req.Title,
		Description:   req.Description,
		StartDate:     start,
		EndDate:       end,
		BaseCurrency:  req.BaseCurrency,
		Budget:        budget,
		CoverImageURL: req.CoverImageURL,
		Notes:         req.Notes,
	})
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toTripResponse(t))
}

func (h *Handler) ListFiltered(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	cursor := c.QueryParam("cursor")
	limit := 12
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	from := c.QueryParam("from") // YYYY-MM-DD or empty
	to := c.QueryParam("to")

	out, err := h.usecase.ListFiltered(userID, cursor, limit, from, to)
	if err != nil {
		return mapErr(err)
	}
	items := make([]map[string]any, 0, len(out.Trips))
	for _, t := range out.Trips {
		items = append(items, toTripResponse(&t))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"items":       items,
		"next_cursor": out.NextCursor,
	})
}

func (h *Handler) ListUpcoming(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	limit := 5
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	trips, err := h.usecase.ListUpcoming(userID, limit)
	if err != nil {
		return mapErr(err)
	}
	items := make([]map[string]any, 0, len(trips))
	for _, t := range trips {
		items = append(items, toTripResponse(&t))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) List(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	cursor := c.QueryParam("cursor")
	limit := 0
	if v := c.QueryParam("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}

	out, err := h.usecase.List(userID, cursor, limit)
	if err != nil {
		return mapErr(err)
	}

	items := make([]map[string]any, 0, len(out.Trips))
	for _, t := range out.Trips {
		items = append(items, toTripResponse(&t))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"items":       items,
		"next_cursor": out.NextCursor,
	})
}

func (h *Handler) Get(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")

	t, days, err := h.usecase.Get(userID, tripID)
	if err != nil {
		return mapErr(err)
	}

	resp := toTripResponse(t)
	resp["days"] = toDaysResponse(days)
	return c.JSON(http.StatusOK, resp)
}

func (h *Handler) Update(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")
	var req tripRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	start, end, err := parseDates(req.StartDate, req.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid date format (expect YYYY-MM-DD)")
	}

	t, err := h.usecase.Update(userID, tripID, UpdateInput{
		Title:         req.Title,
		Description:   req.Description,
		StartDate:     start,
		EndDate:       end,
		BaseCurrency:  req.BaseCurrency,
		Budget:        req.Budget,
		CoverImageURL: req.CoverImageURL,
		Notes:         req.Notes,
	})
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toTripResponse(t))
}

func (h *Handler) Delete(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("id")
	if err := h.usecase.Delete(userID, tripID); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

type dayNotesRequest struct {
	Notes string `json:"notes"`
}

func (h *Handler) UpdateDayNotes(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	dayID := c.Param("day_id")
	var req dayNotesRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	d, err := h.usecase.UpdateDayNotes(userID, dayID, req.Notes)
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"id":         d.ID,
		"trip_id":    d.TripID,
		"date":       d.Date.Format("2006-01-02"),
		"day_number": d.DayNumber,
		"notes":      d.Notes,
	})
}

func parseDates(start, end string) (time.Time, time.Time, error) {
	s, err := time.Parse("2006-01-02", start)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	e, err := time.Parse("2006-01-02", end)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	return s, e, nil
}

func toTripResponse(t *Trip) map[string]any {
	return map[string]any{
		"id":              t.ID,
		"user_id":         t.UserID,
		"title":           t.Title,
		"description":     t.Description,
		"start_date":      t.StartDate.Format("2006-01-02"),
		"end_date":        t.EndDate.Format("2006-01-02"),
		"base_currency":   t.BaseCurrency,
		"budget":          t.Budget,
		"cover_image_url": t.CoverImageURL,
		"notes":           t.Notes,
		"created_at":      t.CreatedAt,
		"updated_at":      t.UpdatedAt,
	}
}

func toDaysResponse(days []Day) []map[string]any {
	out := make([]map[string]any, 0, len(days))
	for _, d := range days {
		out = append(out, map[string]any{
			"id":         d.ID,
			"trip_id":    d.TripID,
			"date":       d.Date.Format("2006-01-02"),
			"day_number": d.DayNumber,
			"notes":      d.Notes,
		})
	}
	return out
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "trip not found")
	case errors.Is(err, ErrDayNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "day not found")
	case errors.Is(err, ErrInvalidDates):
		return echo.NewHTTPError(http.StatusBadRequest, "invalid dates: end must be on or after start")
	case errors.Is(err, ErrInvalidCurrency):
		return echo.NewHTTPError(http.StatusBadRequest, "unsupported base currency")
	case errors.Is(err, ErrInvalidCursor):
		return echo.NewHTTPError(http.StatusBadRequest, "invalid cursor")
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
