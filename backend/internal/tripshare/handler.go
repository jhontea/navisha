package tripshare

import (
	"net/http"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

type Handler struct{ usecase *Usecase }

func NewHandler(usecase *Usecase) *Handler { return &Handler{usecase: usecase} }

func (h *Handler) RegisterRoutes(g *echo.Group, auth echo.MiddlewareFunc) {
	g.POST("/trips/:id/share-links", middleware.WithUser(h.Create), auth)
	g.GET("/trips/:id/share-links/active", middleware.WithUser(h.GetActive), auth)
	g.DELETE("/trips/:id/share-links/active", middleware.WithUser(h.Revoke), auth)
	g.GET("/shared-trips/:token", h.Resolve)
}

func (h *Handler) Create(c echo.Context, uid string) error {
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

func (h *Handler) GetActive(c echo.Context, uid string) error {
	result, err := h.usecase.GetActive(c.Request().Context(), uid, c.Param("id"))
	if err != nil {
		return mapError(err)
	}
	return c.JSON(http.StatusOK, result)
}

func (h *Handler) Revoke(c echo.Context, uid string) error {
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
	return apperr.MapHTTP(err,
		apperr.HTTPMapping{Err: ErrInvalidDuration, Code: http.StatusBadRequest, Message: "duration must be 1, 3, 7, 14, or 30 days"},
		apperr.HTTPMapping{Err: ErrExpired, Code: http.StatusGone, Message: "share link has expired or was revoked"},
		apperr.HTTPMapping{Err: ErrNotFound, Code: http.StatusNotFound, Message: "share link not found"},
		apperr.HTTPMapping{Err: ErrInvalidToken, Code: http.StatusNotFound, Message: "share link not found"},
		apperr.HTTPMapping{Err: apperr.ErrForbidden, Code: http.StatusForbidden, Message: "forbidden"},
	)
}
