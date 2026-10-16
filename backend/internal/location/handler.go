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
	"unicode"

	"github.com/labstack/echo/v4"
	"golang.org/x/text/unicode/norm"
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

	near := limitRunes(strings.TrimSpace(c.QueryParam("near")), 200)
	var items []Suggestion
	var err error
	if kind == "place" && near != "" {
		items, err = h.autocompleteNear(c.Request().Context(), query, language, near)
	} else {
		items, err = h.client.Autocomplete(c.Request().Context(), query, kind, language)
	}
	if err != nil {
		if errors.Is(err, ErrNotConfigured) {
			return echo.NewHTTPError(http.StatusServiceUnavailable, "Geoapify autocomplete is not configured")
		}
		return echo.NewHTTPError(http.StatusBadGateway, "location provider is unavailable")
	}
	return c.JSON(http.StatusOK, map[string]any{"suggestions": items})
}

// maxAutocompleteResults caps the merged list autocompleteNear returns.
const maxAutocompleteResults = 8

// autocompleteNear searches places for a trip at `near` (its destination,
// e.g. "Special Capital Region of Jakarta, Java, Indonesia"). Places within
// destinationRadiusMeters of it come first; places elsewhere are still
// offered (a trip can start in another city), but only in the destination's
// country, so "playground ancol" never lists Boise. When the destination
// cannot be located, the destination is appended to the query text as
// before.
func (h *Handler) autocompleteNear(ctx context.Context, query, language, near string) ([]Suggestion, error) {
	searcher, ok := h.client.(NearSearcher)
	var center *Point
	if ok {
		center = h.cityCenter(ctx, searcher, near)
	}

	var nearby, global []Suggestion
	var nearErr, globalErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		if center != nil {
			nearby, nearErr = searcher.SearchNear(ctx, query, language, *center, destinationRadiusMeters)
		} else {
			nearby, nearErr = h.client.Autocomplete(ctx, query+", "+near, "place", language)
		}
	}()
	country := ""
	if center != nil {
		country = center.CountryCode
	}
	go func() {
		defer wg.Done()
		if cs, ok := h.client.(CountrySearcher); ok && country != "" {
			global, globalErr = cs.SearchCountry(ctx, query, language, country, *center)
			return
		}
		global, globalErr = h.client.Autocomplete(ctx, query, "place", language)
	}()
	wg.Wait()
	if nearErr != nil && globalErr != nil {
		return nil, nearErr
	}

	countries := map[string]bool{}
	if country != "" {
		countries[strings.ToLower(country)] = true
	} else if center != nil {
		for _, s := range nearby {
			if s.CountryCode != "" {
				countries[strings.ToLower(s.CountryCode)] = true
			}
		}
	}
	seen := map[string]bool{}
	var merged []Suggestion
	add := func(s Suggestion) {
		key := s.Provider + ":" + s.ExternalID
		if !seen[key] {
			seen[key] = true
			merged = append(merged, s)
		}
	}
	for _, s := range nearby {
		add(s)
	}
	for _, s := range global {
		if len(countries) > 0 && !countries[strings.ToLower(s.CountryCode)] {
			continue
		}
		add(s)
	}

	// Results naming more of the query's words go first, nearby ones first
	// among equals: "alun-alun majalengka" lists Majalengka's square before
	// the squares around Jakarta that only match "alun".
	words := wordSet(query)
	matched := func(s Suggestion) int {
		have := wordSet(s.Name + " " + s.Description)
		n := 0
		for w := range words {
			if have[w] {
				n++
			}
		}
		return n
	}
	sort.SliceStable(merged, func(i, j int) bool { return matched(merged[i]) > matched(merged[j]) })
	if len(merged) > maxAutocompleteResults {
		merged = merged[:maxAutocompleteResults]
	}
	if merged == nil {
		merged = []Suggestion{}
	}
	return merged, nil
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

	// Places found, per city and for the whole trip.
	byCity := map[string][]Point{}
	var all []Point
	for _, item := range items {
		if s := firstSpecific(item); s != nil {
			p := Point{Lat: s.Latitude, Lng: s.Longitude}
			city := strings.ToLower(item.city)
			byCity[city] = append(byCity[city], p)
			all = append(all, p)
		}
	}

	// Each item is retried around the places found in its own city; around
	// the whole trip's places only when its city is unknown or close to
	// them. A two-city trip (Makkah, Madinah: 340 km apart) must never
	// search one city's places around the other.
	anchorFor := func(item resolveItem) *Point {
		if pts := byCity[strings.ToLower(item.city)]; len(pts) > 0 {
			p := medianPoint(pts)
			return &p
		}
		if len(all) < 2 {
			return nil
		}
		p := medianPoint(all)
		if center := h.cityCenter(ctx, near, item.city); center != nil && distanceKm(*center, p) > outlierKm {
			return nil
		}
		return &p
	}

	type retry struct {
		item    resolveItem
		anchor  Point
		farAway bool
	}
	var retries []retry
	for _, item := range items {
		anchor := anchorFor(item)
		if anchor == nil {
			continue
		}
		s := firstSpecific(item)
		switch {
		case s == nil:
			retries = append(retries, retry{item: item, anchor: *anchor})
		case distanceKm(*anchor, Point{Lat: s.Latitude, Lng: s.Longitude}) > outlierKm:
			retries = append(retries, retry{item: item, anchor: *anchor, farAway: true})
		}
	}
	if len(retries) == 0 {
		return
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 3)
	for _, r := range retries {
		wg.Add(1)
		go func(r retry) {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				return
			}
			found, err := searchQueries(ctx, near, queryVariants(r.item), r.item.names(), r.anchor, anchorRadiusMeters)
			if err != nil || !hasSpecific(found) {
				if r.farAway {
					mu.Lock()
					results[r.item.key] = []Suggestion{} // a far-away namesake is worse than nothing
					mu.Unlock()
				}
				return
			}
			mu.Lock()
			results[r.item.key] = found
			mu.Unlock()
		}(r)
	}
	wg.Wait()
}

func medianPoint(points []Point) Point {
	lats := make([]float64, len(points))
	lngs := make([]float64, len(points))
	for i, p := range points {
		lats[i], lngs[i] = p.Lat, p.Lng
	}
	return Point{Lat: median(lats), Lng: median(lngs)}
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
	queries := queryVariants(item)

	// Around the place's city first, then around the trip destination. A
	// city name can geocode to a namesake elsewhere ("Lembang" exists in
	// several provinces); then only area results come back and the next
	// center is tried.
	var lastErr error
	tried := false
	for _, area := range []struct {
		name   string
		radius int
	}{{item.city, cityRadiusMeters}, {withCountryOf(destination, item.city), destinationRadiusMeters}} {
		center := h.cityCenter(ctx, near, area.name)
		if center == nil {
			continue
		}
		tried = true
		found, err := searchQueries(ctx, near, queries, item.names(), *center, area.radius)
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

// withCountryOf adds the country of a "City, ..., Country" string to a bare
// destination ("Bali" -> "Bali, Indonesia"), so the destination is only
// geocoded inside that country.
func withCountryOf(destination, city string) string {
	parts := strings.Split(city, ",")
	if destination == "" || len(parts) < 2 || strings.Contains(destination, ",") {
		return destination
	}
	return destination + ", " + strings.TrimSpace(parts[len(parts)-1])
}

// searchQueries runs the query variants around center until a result's name
// matches the place, and returns the merged results with the best name
// matches first. Stopping at the first few results is not enough: a city
// word in the query ("Anjum Hotel Makkah") ranks every "... Makkah" hotel
// above the one asked for.
func searchQueries(ctx context.Context, near NearSearcher, queries, names []string, center Point, radius int) ([]Suggestion, error) {
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
		if bestNameMatch(merged, names) >= goodNameMatch {
			break
		}
	}
	if len(merged) == 0 && lastErr != nil {
		return nil, lastErr
	}
	// Results whose name matches go first (best first); the rest keep the
	// provider's relevance order, which a weak word overlap should not undo.
	sort.SliceStable(merged, func(i, j int) bool {
		si, sj := resultScore(merged[i], names), resultScore(merged[j], names)
		if si >= goodNameMatch || sj >= goodNameMatch {
			return si > sj
		}
		return false
	})
	if len(merged) > 8 {
		merged = merged[:8]
	}
	return merged, nil
}

// goodNameMatch is the word overlap at which a result is taken to be the
// place itself (same scale as the app's matching).
const goodNameMatch = 0.5

// names are the item's names to compare results with, without city words
// (a shared "Makkah" says nothing about being the same place).
func (item resolveItem) names() []string {
	cityWords := cityWordSet(item.city)
	out := []string{withoutWords(item.name, cityWords)}
	if item.altName != "" {
		out = append(out, withoutWords(item.altName, cityWords))
	}
	return out
}

// queryVariants lists the searches to try for an item, most specific first:
// the name, the name without its city word, the name with its city, then the
// alternate name (and it without the city word).
func queryVariants(item resolveItem) []string {
	cityWords := cityWordSet(item.city)
	var out []string
	seen := map[string]bool{}
	add := func(q string) {
		q = strings.TrimSpace(q)
		key := strings.ToLower(q)
		if len([]rune(q)) >= 2 && !seen[key] {
			seen[key] = true
			out = append(out, q)
		}
	}
	add(item.name)
	add(withoutWords(item.name, cityWords))
	if item.city != "" {
		add(item.name + ", " + item.city)
	}
	add(item.altName)
	add(withoutWords(item.altName, cityWords))
	return out
}

// cityAliases groups spellings of the same city, so "Makkah" is recognized
// as the city word in a name whose city is given as "Mecca".
var cityAliases = [][]string{
	{"mecca", "makkah", "makka", "mekkah", "mekah"},
	{"medina", "madinah", "madina", "medinah"},
	{"jeddah", "jiddah", "jedah"},
}

// cityWordSet holds the words of a city's name (its part before the first
// comma) plus their known alternate spellings.
func cityWordSet(city string) map[string]bool {
	set := map[string]bool{}
	first := strings.Split(city, ",")[0]
	for w := range wordSet(first) {
		set[w] = true
		for _, group := range cityAliases {
			for _, alias := range group {
				if alias == w {
					for _, a := range group {
						set[a] = true
					}
				}
			}
		}
	}
	return set
}

// withoutWords drops the given words from a name, keeping at least one word.
func withoutWords(name string, drop map[string]bool) string {
	fields := strings.Fields(name)
	kept := fields[:0:0]
	for _, f := range fields {
		if !drop[strings.ToLower(strings.Trim(f, ",.()"))] {
			kept = append(kept, f)
		}
	}
	if len(kept) == 0 {
		return name
	}
	return strings.Join(kept, " ")
}

// genericPlaceWords say what kind of place something is, not which one;
// they count for little when comparing names (as in the app's matching).
var genericPlaceWords = map[string]bool{
	"hotel": true, "inn": true, "resort": true, "hostel": true, "masjid": true, "mosque": true, "restaurant": true,
	"restoran": true, "cafe": true, "kafe": true, "coffee": true, "market": true, "pasar": true, "mall": true,
	"museum": true, "park": true, "taman": true, "airport": true, "bandara": true, "station": true, "stasiun": true,
	"temple": true, "pura": true, "kuil": true, "beach": true, "pantai": true, "the": true, "al": true,
}

// nameMatch is the best weighted word overlap between a result name and any
// of the place's names (0..1); generic words weigh 0.2.
func nameMatch(result string, names []string) float64 {
	best := 0.0
	rw := wordSet(result)
	weight := func(w string) float64 {
		if genericPlaceWords[w] {
			return 0.2
		}
		return 1
	}
	for _, n := range names {
		nw := wordSet(n)
		if len(rw) == 0 || len(nw) == 0 {
			continue
		}
		var common, union float64
		for w := range rw {
			union += weight(w)
			if nw[w] {
				common += weight(w)
			}
		}
		for w := range nw {
			if !rw[w] {
				union += weight(w)
			}
		}
		if v := common / union; v > best {
			best = v
		}
	}
	return best
}

func bestNameMatch(items []Suggestion, names []string) float64 {
	best := 0.0
	for _, s := range items {
		if !areaResultTypes[s.ResultType] {
			if v := resultScore(s, names); v > best {
				best = v
			}
		}
	}
	return best
}

// streetWords mark a name that is itself a street.
var streetWords = map[string]bool{"road": true, "street": true, "jalan": true, "jl": true, "avenue": true, "gang": true}

// resultScore is the name match of a result, halved for a street (by type
// or by name) when the place asked for is not a street: "Al Masjid Al Haram
// Road" is not the mosque.
func resultScore(s Suggestion, names []string) float64 {
	score := nameMatch(s.Name, names)
	if s.ResultType != "street" && !hasStreetWord(s.Name) {
		return score
	}
	for _, n := range names {
		if hasStreetWord(n) {
			return score
		}
	}
	return score / 2
}

func hasStreetWord(name string) bool {
	for w := range wordSet(name) {
		if streetWords[w] {
			return true
		}
	}
	return false
}

// wordSet holds the lowercase words (letters and digits, 2+ characters),
// with diacritics removed ("Ḩarām" -> "haram").
func wordSet(s string) map[string]bool {
	set := map[string]bool{}
	for _, f := range strings.FieldsFunc(foldDiacritics(strings.ToLower(s)), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	}) {
		if len([]rune(f)) >= 2 {
			set[f] = true
		}
	}
	return set
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

// foldDiacritics removes combining marks: "ḩarām" -> "haram".
func foldDiacritics(s string) string {
	var b strings.Builder
	for _, r := range norm.NFD.String(s) {
		if !unicode.Is(unicode.Mn, r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
