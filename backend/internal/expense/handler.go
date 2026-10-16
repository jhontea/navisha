package expense

import (
	"net/http"
	"strings"

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
	g.GET("/trips/:trip_id/expenses", middleware.WithUser(h.List), authMiddleware)
	g.POST("/trips/:trip_id/expenses", middleware.WithUser(h.Create), authMiddleware)
	g.GET("/trips/:trip_id/expenses/summary", middleware.WithUser(h.Summary), authMiddleware)
	g.PUT("/expenses/:id", middleware.WithUser(h.Update), authMiddleware)
	g.DELETE("/expenses/:id", middleware.WithUser(h.Delete), authMiddleware)
}

type expenseRequest struct {
	Title       string  `json:"title"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Category    string  `json:"category"`
	ActivityID  *string `json:"activity_id"`
	ExpenseDate string  `json:"expense_date"` // YYYY-MM-DD, optional
	Note        string  `json:"note"`
}

func (h *Handler) List(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, e := range items {
		resp = append(resp, toResponse(&e))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

// clean strips HTML before the required checks (a tag-only title counts as
// empty) and normalizes the currency code.
func (r *expenseRequest) clean() *echo.HTTPError {
	if sanitize.TooLong(r.Title, 200) {
		return echo.NewHTTPError(http.StatusBadRequest, "title must be 200 characters or less")
	}
	if sanitize.TooLong(r.Note, 2000) {
		return echo.NewHTTPError(http.StatusBadRequest, "note is too long")
	}
	r.Title = strings.TrimSpace(sanitize.Text(r.Title))
	r.Note = sanitize.Text(r.Note)
	r.Currency = strings.ToUpper(strings.TrimSpace(r.Currency))
	if r.Title == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "title is required")
	}
	if r.Amount <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "amount must be greater than 0")
	}
	if r.Currency == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "currency is required")
	}
	return nil
}

func (h *Handler) Create(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	var req expenseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if err := req.clean(); err != nil {
		return err
	}
	e, err := h.usecase.Create(c.Request().Context(), userID, tripID, CreateInput{
		Title:       req.Title,
		Amount:      req.Amount,
		Currency:    req.Currency,
		Category:    Category(req.Category),
		ActivityID:  req.ActivityID,
		ExpenseDate: req.ExpenseDate,
		Note:        req.Note,
	})
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(e))
}

func (h *Handler) Update(c echo.Context, userID string) error {
	id := c.Param("id")
	var req expenseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if err := req.clean(); err != nil {
		return err
	}
	e, err := h.usecase.Update(c.Request().Context(), userID, id, UpdateInput{
		Title:       req.Title,
		Amount:      req.Amount,
		Currency:    req.Currency,
		Category:    Category(req.Category),
		ActivityID:  req.ActivityID,
		ExpenseDate: req.ExpenseDate,
		Note:        req.Note,
	})
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusOK, toResponse(e))
}

func (h *Handler) Delete(c echo.Context, userID string) error {
	id := c.Param("id")
	if err := h.usecase.Delete(c.Request().Context(), userID, id); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) Summary(c echo.Context, userID string) error {
	tripID := c.Param("trip_id")
	s, err := h.usecase.Summary(c.Request().Context(), userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	cats := make([]map[string]any, 0, len(s.ByCategory))
	for _, c := range s.ByCategory {
		cats = append(cats, map[string]any{
			"category": string(c.Category),
			"total":    c.Total,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"total_base":    s.TotalBase,
		"base_currency": s.BaseCurrency,
		"by_category":   cats,
	})
}

func toResponse(e *Expense) map[string]any {
	return map[string]any{
		"id":                e.ID,
		"trip_id":           e.TripID,
		"activity_id":       e.ActivityID,
		"transportation_id": e.TransportationID,
		"accommodation_id":  e.AccommodationID,
		"title":             e.Title,
		"amount":            e.Amount,
		"currency":          e.Currency,
		"converted_amount":  e.ConvertedAmount,
		"base_currency":     e.BaseCurrency,
		"category":          string(e.Category),
		"expense_date":      e.ExpenseDate.Format("2006-01-02"),
		"note":              e.Note,
		"created_at":        e.CreatedAt,
		"updated_at":        e.UpdatedAt,
	}
}

func mapErr(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrNotFound, Code: http.StatusNotFound, Message: "expense not found"},
		apperr.HTTPMapping{Err: ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: ErrInvalidCategory, Code: http.StatusBadRequest, Message: "invalid category"},
		apperr.HTTPMapping{Err: ErrInvalidCurrency, Code: http.StatusBadRequest, Message: "invalid currency"},
		apperr.HTTPMapping{Err: ErrInvalidDate, Code: http.StatusBadRequest, Message: "invalid expense_date (expect YYYY-MM-DD)"},
		apperr.HTTPMapping{Err: apperr.ErrRatesUnavailable, Code: http.StatusServiceUnavailable, Message: "Couldn't fetch exchange rates. Try again in a moment."},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
