package tripshare

import (
	"errors"
	"net/http"

	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

type Handler struct{ usecase *Usecase }

func NewHandler(usecase *Usecase) *Handler { return &Handler{usecase: usecase} }

func (h *Handler) RegisterRoutes(g *echo.Group, auth echo.MiddlewareFunc) {
	g.POST("/trips/:id/share-links", h.Create, auth)
	g.GET("/trips/:id/share-links/active", h.GetActive, auth)
	g.DELETE("/trips/:id/share-links/active", h.Revoke, auth)
	g.GET("/shared-trips/:token", h.Resolve)
}

func userID(c echo.Context) (string, error) {
	id, ok := c.Get(middleware.UserIDKey).(string)
	if !ok || id == "" {
		return "", echo.NewHTTPError(http.StatusUnauthorized, "missing user context")
	}
	return id, nil
}

func (h *Handler) Create(c echo.Context) error {
	uid, err := userID(c)
	if err != nil {
		return err
	}
	var req struct {
		DurationDays int `json:"duration_days"`
	}
	if c.Bind(&req) != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	result, err := h.usecase.Create(c.Request().Context(), uid, c.Param("id"), req.DurationDays)
	if err != nil {
		return mapError(err)
	}
	return c.JSON(http.StatusCreated, result)
}

func (h *Handler) GetActive(c echo.Context) error {
	uid, err := userID(c)
	if err != nil {
		return err
	}
	result, err := h.usecase.GetActive(c.Request().Context(), uid, c.Param("id"))
	if err != nil {
		return mapError(err)
	}
	return c.JSON(http.StatusOK, result)
}

func (h *Handler) Revoke(c echo.Context) error {
	uid, err := userID(c)
	if err != nil {
		return err
	}
	if err := h.usecase.Revoke(c.Request().Context(), uid, c.Param("id")); err != nil {
		return mapError(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) Resolve(c echo.Context) error {
	c.Response().Header().Set("X-Robots-Tag", "noindex, nofollow")
	c.Response().Header().Set("Referrer-Policy", "no-referrer")
	result, err := h.usecase.Resolve(c.Request().Context(), c.Param("token"))
	if err != nil {
		return mapError(err)
	}
	return c.JSON(http.StatusOK, result)
}

func mapError(err error) error {
	switch {
	case errors.Is(err, ErrInvalidDuration):
		return echo.NewHTTPError(http.StatusBadRequest, "duration must be 1, 3, 7, 14, or 30 days")
	case errors.Is(err, ErrExpired):
		return echo.NewHTTPError(http.StatusGone, "share link has expired or was revoked")
	case errors.Is(err, ErrNotFound), errors.Is(err, ErrInvalidToken):
		return echo.NewHTTPError(http.StatusNotFound, "share link not found")
	default:
		return err
	}
}
