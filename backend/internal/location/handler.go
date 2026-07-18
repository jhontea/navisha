package location

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	client AutocompleteClient
}

func NewHandler(client AutocompleteClient) *Handler {
	return &Handler{client: client}
}

func (h *Handler) RegisterRoutes(group *echo.Group, authMiddleware echo.MiddlewareFunc) {
	group.GET("/locations/autocomplete", h.Autocomplete, authMiddleware)
}

func (h *Handler) Autocomplete(c echo.Context) error {
	query := strings.TrimSpace(c.QueryParam("query"))
	if len([]rune(query)) < 3 || len([]rune(query)) > 200 {
		return echo.NewHTTPError(http.StatusBadRequest, "query must be between 3 and 200 characters")
	}

	kind := strings.ToLower(strings.TrimSpace(c.QueryParam("kind")))
	if kind == "" {
		kind = "place"
	}
	if kind != "place" && kind != "region" {
		return echo.NewHTTPError(http.StatusBadRequest, "kind must be place or region")
	}

	language := strings.ToLower(strings.TrimSpace(c.QueryParam("lang")))
	if len(language) != 2 {
		language = "en"
	}

	items, err := h.client.Autocomplete(c.Request().Context(), query, kind, language)
	if err != nil {
		if errors.Is(err, ErrNotConfigured) {
			return echo.NewHTTPError(http.StatusServiceUnavailable, "Geoapify autocomplete is not configured")
		}
		return echo.NewHTTPError(http.StatusBadGateway, "location provider is unavailable")
	}
	return c.JSON(http.StatusOK, map[string]any{"suggestions": items})
}
