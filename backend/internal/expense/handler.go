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
	g.GET("/trips/:trip_id/expenses", h.List, authMiddleware)
	g.POST("/trips/:trip_id/expenses", h.Create, authMiddleware)
	g.GET("/trips/:trip_id/expenses/summary", h.Summary, authMiddleware)
	g.PUT("/expenses/:id", h.Update, authMiddleware)
	g.DELETE("/expenses/:id", h.Delete, authMiddleware)
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

func (h *Handler) List(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	items, err := h.usecase.List(userID, tripID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(items))
	for _, e := range items {
		resp = append(resp, toResponse(&e))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *Handler) Create(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	var req expenseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	// Early validation (Iteration 7: user-friendly errors)
	if strings.TrimSpace(req.Title) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "title is required")
	}
	if req.Amount <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "amount must be greater than 0")
	}
	if strings.TrimSpace(req.Currency) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "currency is required")
	}
	// Loop 33: additional validation.
	if len(req.Title) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "title must be 200 characters or less")
	}
	if len(req.Note) > 2000 {
		return echo.NewHTTPError(http.StatusBadRequest, "note is too long")
	}
	req.Title = sanitize.Text(req.Title)
	req.Note = sanitize.Text(req.Note)
	e, err := h.usecase.Create(userID, tripID, CreateInput{
		Title:       req.Title,
		Amount:      req.Amount,
		Currency:    strings.ToUpper(req.Currency),
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

func (h *Handler) Update(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	id := c.Param("id")
	var req expenseRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if strings.TrimSpace(req.Title) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "title is required")
	}
	if req.Amount <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "amount must be greater than 0")
	}
	if len(req.Title) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "title must be 200 characters or less")
	}
	if len(req.Note) > 2000 {
		return echo.NewHTTPError(http.StatusBadRequest, "note is too long")
	}
	req.Title = sanitize.Text(req.Title)
	req.Note = sanitize.Text(req.Note)
	e, err := h.usecase.Update(userID, id, UpdateInput{
		Title:       req.Title,
		Amount:      req.Amount,
		Currency:    strings.ToUpper(req.Currency),
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

func (h *Handler) Delete(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	id := c.Param("id")
	if err := h.usecase.Delete(userID, id); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) Summary(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	tripID := c.Param("trip_id")
	s, err := h.usecase.Summary(userID, tripID)
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
		"id":               e.ID,
		"trip_id":          e.TripID,
		"activity_id":      e.ActivityID,
		"title":            e.Title,
		"amount":           e.Amount,
		"currency":         e.Currency,
		"converted_amount": e.ConvertedAmount,
		"base_currency":    e.BaseCurrency,
		"category":         string(e.Category),
		"expense_date":     e.ExpenseDate.Format("2006-01-02"),
		"note":             e.Note,
		"created_at":       e.CreatedAt,
		"updated_at":       e.UpdatedAt,
	}
}

func mapErr(err error) error {
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrNotFound, Code: http.StatusNotFound, Message: "expense not found"},
		apperr.HTTPMapping{Err: ErrTripNotFound, Code: http.StatusNotFound, Message: "trip not found"},
		apperr.HTTPMapping{Err: ErrInvalidCategory, Code: http.StatusBadRequest, Message: "invalid category"},
		apperr.HTTPMapping{Err: ErrInvalidCurrency, Code: http.StatusBadRequest, Message: "invalid currency"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
