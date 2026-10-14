package location

import (
	"context"
	"errors"
	"math"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	client AutocompleteClient
	// cities caches city name -> *Point (nil when not found) for Resolve,
	// up to maxCachedCities entries.
	cities      sync.Map
	citiesCount atomic.Int32
}

const maxCachedCities = 2000

func NewHandler(client AutocompleteClient) *Handler {
	return &Handler{client: client}
}

// MaxResolveItems bounds one /locations/resolve request (10 days x 6 activities
// fits with room to spare).
const MaxResolveItems = 100

// Radius of the search around a place's city, and around the trip
// destination when the city is unknown.
const (
	cityRadiusMeters        = 50_000
	destinationRadiusMeters = 100_000
)

func (h *Handler) RegisterRoutes(group *echo.Group, authMiddleware echo.MiddlewareFunc) {
	group.GET("/locations/autocomplete", h.Autocomplete, authMiddleware)
	group.POST("/locations/resolve", h.Resolve, authMiddleware)
	group.POST("/locations/link", h.MapsLink, authMiddleware)
}

type resolveRequest struct {
	Destination string `json:"destination"`
	Items       []struct {
		Key string `json:"key"`
		// Name is the searchable name (the place's official name when known).
		Name string `json:"name"`
		// AltName is another name for the same place (e.g. the display name).
		AltName string `json:"alt_name"`
		// City is where the place is; searches are limited to around it.
		City string `json:"city"`
	} `json:"items"`
}

type resolveItem struct {
	key     string
	name    string
	altName string
	city    string
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

// mapsLinkRequest is the body for POST /locations/link.
type mapsLinkRequest struct {
	URL string `json:"url"`
}

// MapsLink resolves a pasted Google Maps link (including short goo.gl links)
// into a single place suggestion. Coordinates are taken from the link and the
// address is enriched via reverse geocoding when possible.
func (h *Handler) MapsLink(c echo.Context) error {
	var request mapsLinkRequest
	if err := c.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	raw := strings.TrimSpace(request.URL)
	if raw == "" || len(raw) > 2048 {
		return echo.NewHTTPError(http.StatusBadRequest, "url must be 1 to 2048 characters")
	}

	suggestion, err := ResolveMapsLink(c.Request().Context(), http.DefaultClient, h.client.(*GeoapifyClient), raw)
	if err != nil {
		if errors.Is(err, ErrNotConfigured) {
			return echo.NewHTTPError(http.StatusServiceUnavailable, "location provider is not configured")
		}
		if errors.Is(err, ErrUnsupportedLink) {
			return echo.NewHTTPError(http.StatusBadRequest, "not a recognized Google Maps place link")
		}
		return echo.NewHTTPError(http.StatusBadGateway, "failed to resolve maps link")
	}
	return c.JSON(http.StatusOK, map[string]any{"suggestion": suggestion})
}

// Resolve batches place lookups behind one application request. Upstream
// calls are bounded so large itineraries do not create an unbounded burst.
// When the client can search near a point, each place is searched around its
// city (or the destination), with its name, name + city and alternate name.
func (h *Handler) Resolve(c echo.Context) error {
	var request resolveRequest
	if err := c.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}
	request.Destination = strings.TrimSpace(request.Destination)
	if len([]rune(request.Destination)) > 200 || len(request.Items) == 0 || len(request.Items) > MaxResolveItems {
		return echo.NewHTTPError(http.StatusBadRequest, "items must contain 1 to 100 places")
	}

	normalized := make([]resolveItem, 0, len(request.Items))
	keys := make(map[string]struct{}, len(request.Items))
	for _, item := range request.Items {
		key := strings.TrimSpace(item.Key)
		name := strings.TrimSpace(item.Name)
		if key == "" || len([]rune(name)) < 2 || len([]rune(name)) > 200 {
			return echo.NewHTTPError(http.StatusBadRequest, "each item requires a key and a 2 to 200 character name")
		}
		if _, exists := keys[key]; exists {
			return echo.NewHTTPError(http.StatusBadRequest, "item keys must be unique")
		}
		keys[key] = struct{}{}
		normalized = append(normalized, resolveItem{
			key:     key,
			name:    name,
			altName: limitRunes(strings.TrimSpace(item.AltName), 200),
			city:    limitRunes(strings.TrimSpace(item.City), 100),
		})
	}

	ctx := c.Request().Context()
	near, canSearchNear := h.client.(NearSearcher)
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
			var items []Suggestion
			var err error
			if canSearchNear {
				items, err = h.searchAround(ctx, near, item, request.Destination)
			}
			if !canSearchNear || (err == nil && items == nil) {
				// Plain search: results are not limited to an area, so they
				// are not near_city and only a name match will be used.
				query := item.name
				if item.city != "" {
					query += ", " + item.city
				} else if request.Destination != "" {
					query += ", " + request.Destination
				}
				items, err = h.client.Autocomplete(ctx, query, "place", "en")
			}
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
	if canSearchNear {
		h.retryAroundFoundPlaces(ctx, near, normalized, results)
	}
	return c.JSON(http.StatusOK, map[string]any{"results": results})
}

// anchorRadiusMeters bounds the second pass around the places already found;
// a result farther than outlierKm from them is treated as a wrong namesake.
const (
	anchorRadiusMeters = 80_000
	outlierKm          = 300
)

// retryAroundFoundPlaces searches again, around the median of the places
// already found, for every item that got no specific place. City names are
// ambiguous for geocoders ("Badung" resolves to East Java, "Bali" to a
// district in Taiwan), but the itinerary's other places show where the trip
// really is.
func (h *Handler) retryAroundFoundPlaces(ctx context.Context, near NearSearcher, items []resolveItem, results map[string][]Suggestion) {
	firstSpecific := func(item resolveItem) *Suggestion {
		for i, s := range results[item.key] {
			if s.NearCity && !areaResultTypes[s.ResultType] {
				return &results[item.key][i]
			}
		}
		return nil
	}
	var lats, lngs []float64
	for _, item := range items {
		if s := firstSpecific(item); s != nil {
			lats, lngs = append(lats, s.Latitude), append(lngs, s.Longitude)
		}
	}
	if len(lats) < 2 {
		return
	}
	anchor := Point{Lat: median(lats), Lng: median(lngs)}

	// Retry places with nothing specific, and places whose result is far
	// from the rest of the trip (a namesake in another country).
	var missing []resolveItem
	for _, item := range items {
		s := firstSpecific(item)
		if s == nil || distanceKm(anchor, Point{Lat: s.Latitude, Lng: s.Longitude}) > outlierKm {
			missing = append(missing, item)
		}
	}
	if len(missing) == 0 {
		return
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 4)
	for _, item := range missing {
		wg.Add(1)
		go func(item resolveItem) {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				return
			}
			queries := []string{item.name}
			if item.altName != "" && !strings.EqualFold(item.altName, item.name) {
				queries = append(queries, item.altName)
			}
			found, err := searchQueries(ctx, near, queries, anchor, anchorRadiusMeters)
			if err != nil || !hasSpecific(found) {
				if s := firstSpecific(item); s != nil && distanceKm(anchor, Point{Lat: s.Latitude, Lng: s.Longitude}) > outlierKm {
					mu.Lock()
					results[item.key] = []Suggestion{} // a far-away namesake is worse than nothing
					mu.Unlock()
				}
				return
			}
			mu.Lock()
			results[item.key] = found
			mu.Unlock()
		}(item)
	}
	wg.Wait()
}

// distanceKm is the great-circle distance between two points.
func distanceKm(a, b Point) float64 {
	const earthKm = 6371.0
	rad := math.Pi / 180
	dLat := (b.Lat - a.Lat) * rad
	dLng := (b.Lng - a.Lng) * rad
	h := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(a.Lat*rad)*math.Cos(b.Lat*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthKm * math.Asin(math.Sqrt(h))
}

func median(values []float64) float64 {
	sorted := append([]float64(nil), values...)
	sort.Float64s(sorted)
	mid := len(sorted) / 2
	if len(sorted)%2 == 0 {
		return (sorted[mid-1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

// searchAround looks the item up around its city, or the destination. It
// returns nil (not an error) when neither can be located, so the caller falls
// back to a plain search.
func (h *Handler) searchAround(ctx context.Context, near NearSearcher, item resolveItem, destination string) ([]Suggestion, error) {
	queries := []string{item.name}
	if item.city != "" {
		queries = append(queries, item.name+", "+item.city)
	}
	if item.altName != "" && !strings.EqualFold(item.altName, item.name) {
		queries = append(queries, item.altName)
	}

	// Around the place's city first, then around the trip destination. A
	// city name can geocode to a namesake elsewhere ("Lembang" exists in
	// several provinces); then only area results come back and the next
	// center is tried.
	var lastErr error
	tried := false
	for _, area := range []struct {
		name   string
		radius int
	}{{item.city, cityRadiusMeters}, {destination, destinationRadiusMeters}} {
		center := h.cityCenter(ctx, near, area.name)
		if center == nil {
			continue
		}
		tried = true
		found, err := searchQueries(ctx, near, queries, *center, area.radius)
		if err != nil {
			lastErr = err
			continue
		}
		if hasSpecific(found) {
			return found, nil
		}
	}
	if !tried || lastErr == nil {
		return nil, nil // caller falls back to a plain search
	}
	return nil, lastErr
}

func searchQueries(ctx context.Context, near NearSearcher, queries []string, center Point, radius int) ([]Suggestion, error) {
	merged := make([]Suggestion, 0, 8)
	seen := map[string]bool{}
	var lastErr error
	for _, q := range queries {
		found, err := near.SearchNear(ctx, q, "en", center, radius)
		if err != nil {
			lastErr = err
			continue
		}
		for _, s := range found {
			id := s.ExternalID
			if id == "" {
				id = s.Name + "|" + s.Description
			}
			if !seen[id] {
				seen[id] = true
				merged = append(merged, s)
			}
		}
		if hasSpecific(merged) && len(merged) >= 3 {
			break
		}
	}
	if len(merged) == 0 && lastErr != nil {
		return nil, lastErr
	}
	if len(merged) > 8 {
		merged = merged[:8]
	}
	return merged, nil
}

// areaResultTypes are whole areas, too coarse to pin an activity on.
var areaResultTypes = map[string]bool{
	"city": true, "county": true, "state": true, "country": true, "postcode": true, "suburb": true, "district": true,
}

// hasSpecific reports whether any result is a specific place, not an area.
func hasSpecific(items []Suggestion) bool {
	for _, s := range items {
		if !areaResultTypes[s.ResultType] {
			return true
		}
	}
	return false
}

// cityCenter geocodes a city once and caches it (including misses).
func (h *Handler) cityCenter(ctx context.Context, near NearSearcher, city string) *Point {
	key := strings.ToLower(strings.TrimSpace(city))
	if key == "" {
		return nil
	}
	if cached, ok := h.cities.Load(key); ok {
		return cached.(*Point)
	}
	center, err := near.CityCenter(ctx, city, "en")
	if err != nil {
		return nil // transient: do not cache
	}
	if h.citiesCount.Load() < maxCachedCities {
		if _, loaded := h.cities.LoadOrStore(key, center); !loaded {
			h.citiesCount.Add(1)
		}
	}
	return center
}

func limitRunes(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}
