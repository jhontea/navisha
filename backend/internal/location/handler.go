package location

import (
	"errors"
	"net/http"
	"strings"
	"sync"

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
	group.POST("/locations/resolve", h.Resolve, authMiddleware)
}

type resolveRequest struct {
	Destination string `json:"destination"`
	Items       []struct {
		Key  string `json:"key"`
		Name string `json:"name"`
	} `json:"items"`
}

type resolveItem struct {
	key  string
	name string
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

// Resolve batches place lookups behind one application request. Upstream
// calls are bounded so large itineraries do not create an unbounded burst.
func (h *Handler) Resolve(c echo.Context) error {
	var request resolveRequest
	if err := c.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	request.Destination = strings.TrimSpace(request.Destination)
	if len([]rune(request.Destination)) > 200 || len(request.Items) == 0 || len(request.Items) > 50 {
		return echo.NewHTTPError(http.StatusBadRequest, "items must contain 1 to 50 places")
	}

	normalized := make([]resolveItem, 0, len(request.Items))
	keys := make(map[string]struct{}, len(request.Items))
	for _, item := range request.Items {
		key := strings.TrimSpace(item.Key)
		name := strings.TrimSpace(item.Name)
		if key == "" || len([]rune(name)) < 3 || len([]rune(name)) > 200 {
			return echo.NewHTTPError(http.StatusBadRequest, "each item requires a key and a 3 to 200 character name")
		}
		if _, exists := keys[key]; exists {
			return echo.NewHTTPError(http.StatusBadRequest, "item keys must be unique")
		}
		keys[key] = struct{}{}
		normalized = append(normalized, resolveItem{key: key, name: name})
	}

	ctx := c.Request().Context()
	results := make(map[string][]Suggestion, len(normalized))
	var mu sync.Mutex
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 4)
	successes := 0

	for _, item := range normalized {
		wg.Add(1)
		go func(item resolveItem) {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				return
			}
			query := item.name
			if request.Destination != "" {
				query += ", " + request.Destination
			}
			items, err := h.client.Autocomplete(ctx, query, "place", "en")
			mu.Lock()
			defer mu.Unlock()
			if err == nil {
				results[item.key] = items
				successes++
			} else {
				results[item.key] = []Suggestion{}
			}
		}(item)
	}
	wg.Wait()
	if successes == 0 {
		return echo.NewHTTPError(http.StatusBadGateway, "location provider is unavailable")
	}
	return c.JSON(http.StatusOK, map[string]any{"results": results})
}
