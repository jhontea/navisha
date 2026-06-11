package activity

import (
	"encoding/json"
	"errors"
	"net/http"

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
	g.GET("/days/:day_id/activities", h.List, authMiddleware)
	g.POST("/days/:day_id/activities", h.Create, authMiddleware)
	g.PUT("/days/:day_id/activities/reorder", h.Reorder, authMiddleware)
	g.PUT("/activities/:id", h.Update, authMiddleware)
	g.DELETE("/activities/:id", h.Delete, authMiddleware)
}

type createRequest struct {
	Type      Type            `json:"type"`
	Title     string          `json:"title"`
	StartTime string          `json:"start_time"`
	EndTime   string          `json:"end_time"`
	Payload   json.RawMessage `json:"payload"`
}

type updateRequest struct {
	Title     string          `json:"title"`
	StartTime string          `json:"start_time"`
	EndTime   string          `json:"end_time"`
	Payload   json.RawMessage `json:"payload"`
}

type reorderRequest struct {
	IDs []string `json:"ids"`
}

func (h *Handler) List(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	dayID := c.Param("day_id")
	out, err := h.usecase.List(userID, dayID)
	if err != nil {
		return mapErr(err)
	}
	resp := make([]map[string]any, 0, len(out))
	for _, a := range out {
		resp = append(resp, toResponse(&a))
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *Handler) Create(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	dayID := c.Param("day_id")
	var req createRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	a, err := h.usecase.Create(c.Request().Context(), userID, dayID, CreateInput{
		Type:      req.Type,
		Title:     req.Title,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Payload:   req.Payload,
	})
	if err != nil {
		return mapErr(err)
	}
	return c.JSON(http.StatusCreated, toResponse(a))
}

func (h *Handler) Update(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	id := c.Param("id")
	var req updateRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	a, err := h.usecase.Update(userID, id, UpdateInput{
		Title:     req.Title,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Payload:   req.Payload,
	})
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

func (h *Handler) Reorder(c echo.Context) error {
	userID := c.Get(middleware.UserIDKey).(string)
	dayID := c.Param("day_id")
	var req reorderRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	if err := h.usecase.Reorder(c.Request().Context(), userID, dayID, req.IDs); err != nil {
		return mapErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func toResponse(a *Activity) map[string]any {
	// Pass payload through as raw JSON so per-type shape is preserved.
	var payload any
	if len(a.Payload) > 0 {
		_ = json.Unmarshal(a.Payload, &payload)
	}
	return map[string]any{
		"id":          a.ID,
		"day_id":      a.DayID,
		"type":        string(a.Type),
		"title":       a.Title,
		"start_time":  a.StartTime,
		"end_time":    a.EndTime,
		"order_index": a.OrderIndex,
		"payload":     payload,
		"created_at":  a.CreatedAt,
		"updated_at":  a.UpdatedAt,
	}
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "activity not found")
	case errors.Is(err, ErrDayNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "day not found")
	case errors.Is(err, ErrInvalidType):
		return echo.NewHTTPError(http.StatusBadRequest, "invalid activity type (expect location|note|todo)")
	case errors.Is(err, ErrInvalidPayload):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrReorderMismatch):
		return echo.NewHTTPError(http.StatusBadRequest, "reorder list does not match day activities")
	case errors.Is(err, apperr.ErrForbidden):
		return echo.NewHTTPError(http.StatusForbidden, "forbidden")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "internal error")
	}
}
