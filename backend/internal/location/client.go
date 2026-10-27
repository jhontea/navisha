package location

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("location provider is not configured")

// ErrNoRoute means the provider found no route between the points (e.g. across
// the sea); asking again will not help.
var ErrNoRoute = errors.New("no route between the points")

type Suggestion struct {
	Provider    string  `json:"provider"`
	ExternalID  string  `json:"external_id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	CountryCode string  `json:"country_code"`
	Latitude    float64 `json:"lat"`
	Longitude   float64 `json:"lng"`
	// SourceURL carries the original (redirect-resolved) Google Maps link
	// when the suggestion came from POST /locations/link. Empty otherwise.
	SourceURL string `json:"source_url,omitempty"`
	// ResultType is the provider's kind of result (amenity, building,
	// street, city, ...), when known.
	ResultType string `json:"result_type,omitempty"`
	// NearCity is true when the search was limited to the place's city, so
	// any result is at least in the right area.
	NearCity bool `json:"near_city,omitempty"`
}

// Point is a WGS84 coordinate.
type Point struct {
	Lat float64
	Lng float64
	// CountryCode is the ISO code of the area CityCenter located, when known.
	CountryCode string
}

// NearSearcher finds places inside a radius around a point and locates
// cities. GeoapifyClient implements it; Resolve falls back to plain
// Autocomplete for clients that do not.
type NearSearcher interface {
	SearchNear(ctx context.Context, query, language string, center Point, radiusMeters int) ([]Suggestion, error)
	CityCenter(ctx context.Context, city, language string) (*Point, error)
}

// CountrySearcher autocompletes within one country, ranking places near
// bias first. GeoapifyClient implements it.
type CountrySearcher interface {
	SearchCountry(ctx context.Context, query, language, countryCode string, bias Point) ([]Suggestion, error)
}

type AutocompleteClient interface {
	Autocomplete(ctx context.Context, query, kind, language string) ([]Suggestion, error)
}

type GeoapifyClient struct {
	apiKey     string
	baseURL    string
	routingURL string
	client     *http.Client
}

// geoapifyRoutingURL is fixed in code: routing is not a configurable provider.
const geoapifyRoutingURL = "https://api.geoapify.com/v1/routing"

func NewGeoapifyClient(apiKey, baseURL string, timeout time.Duration) *GeoapifyClient {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.geoapify.com/v1/geocode/autocomplete"
	}
	if timeout <= 0 {
		timeout = 8 * time.Second
	}
	return &GeoapifyClient{
		apiKey:     strings.TrimSpace(apiKey),
		baseURL:    strings.TrimSpace(baseURL),
		routingURL: geoapifyRoutingURL,
		client:     &http.Client{Timeout: timeout},
	}
}

type geoapifyResponse struct {
	Results []struct {
		ResultType  string  `json:"result_type"`
		PlaceID     string  `json:"place_id"`
		Name        string  `json:"name"`
		Formatted   string  `json:"formatted"`
		CountryCode string  `json:"country_code"`
		Latitude    float64 `json:"lat"`
		Longitude   float64 `json:"lon"`
	} `json:"results"`
}

func (c *GeoapifyClient) Autocomplete(ctx context.Context, query, kind, language string) ([]Suggestion, error) {
	if c.apiKey == "" {
		return nil, ErrNotConfigured
	}

	providerURL := c.baseURL
	if kind == "region" {
		providerURL = strings.Replace(providerURL, "/autocomplete", "/search", 1)
	}

	endpoint, err := url.Parse(providerURL)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.Autocomplete: parse base url: %w", err)
	}
	params := endpoint.Query()
	params.Set("text", query)
	if language != "" {
		params.Set("lang", language)
	}
	return c.fetch(ctx, endpoint, params, 6)
}

// SearchNear autocompletes query among places within radiusMeters of center.
func (c *GeoapifyClient) SearchNear(ctx context.Context, query, language string, center Point, radiusMeters int) ([]Suggestion, error) {
	if c.apiKey == "" {
		return nil, ErrNotConfigured
	}
	endpoint, err := url.Parse(c.baseURL)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchNear: parse base url: %w", err)
	}
	params := endpoint.Query()
	params.Set("text", query)
	params.Set("filter", fmt.Sprintf("circle:%f,%f,%d", center.Lng, center.Lat, radiusMeters))
	params.Set("bias", fmt.Sprintf("proximity:%f,%f", center.Lng, center.Lat))
	if language != "" {
		params.Set("lang", language)
	}
	items, err := c.fetch(ctx, endpoint, params, 8)
	for i := range items {
		items[i].NearCity = true
	}
	return items, err
}

// SearchCountry autocompletes query among places in countryCode, nearest
// to bias first.
func (c *GeoapifyClient) SearchCountry(ctx context.Context, query, language, countryCode string, bias Point) ([]Suggestion, error) {
	if c.apiKey == "" {
		return nil, ErrNotConfigured
	}
	endpoint, err := url.Parse(c.baseURL)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCountry: parse base url: %w", err)
	}
	params := endpoint.Query()
	params.Set("text", query)
	params.Set("filter", "countrycode:"+strings.ToLower(countryCode))
	params.Set("bias", fmt.Sprintf("proximity:%f,%f", bias.Lng, bias.Lat))
	if language != "" {
		params.Set("lang", language)
	}
	return c.fetch(ctx, endpoint, params, 8)
}

// CityCenter returns the coordinates of a city (or, failing that, any area
// with that name), or nil when it cannot be found.
func (c *GeoapifyClient) CityCenter(ctx context.Context, city, language string) (*Point, error) {
	if c.apiKey == "" {
		return nil, ErrNotConfigured
	}
	endpoint, err := url.Parse(strings.Replace(c.baseURL, "/autocomplete", "/search", 1))
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.CityCenter: parse base url: %w", err)
	}
	for _, kind := range []string{"city", ""} {
		params := endpoint.Query()
		params.Set("text", city)
		if kind != "" {
			params.Set("type", kind)
		}
		if language != "" {
			params.Set("lang", language)
		}
		items, err := c.fetch(ctx, endpoint, params, 3)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			if inRegion(item.Description, city) {
				return &Point{Lat: item.Latitude, Lng: item.Longitude, CountryCode: item.CountryCode}, nil
			}
		}
	}
	return nil, nil
}

// inRegion reports whether a geocoded address lies in the region and
// country named in a "City, Region, Country" (or "City, Country") string.
// Names repeat across provinces and countries ("Canggu, Bali" geocodes to
// Canggu in Lampung, "Bali, Indonesia" to a district in Taiwan), so a result
// outside the stated region or country is not that place. A bare name
// ("Bali") is accepted as is.
func inRegion(address, city string) bool {
	parts := strings.Split(city, ",")
	if len(parts) < 2 {
		return true
	}
	addr := foldDiacritics(strings.ToLower(address))
	for _, region := range parts[1:] {
		if r := foldDiacritics(strings.ToLower(strings.TrimSpace(region))); r != "" && !strings.Contains(addr, r) {
			return false
		}
	}
	return true
}

func (c *GeoapifyClient) fetch(ctx context.Context, endpoint *url.URL, params url.Values, limit int) ([]Suggestion, error) {
	params.Set("format", "json")
	params.Set("limit", fmt.Sprint(limit))
	params.Set("apiKey", c.apiKey)
	u := *endpoint
	u.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient: create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.do(req)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("location.GeoapifyClient: provider status %d", resp.StatusCode)
	}

	var payload geoapifyResponse
	decoder := json.NewDecoder(io.LimitReader(resp.Body, 1<<20))
	if err := decoder.Decode(&payload); err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient: decode response: %w", err)
	}

	items := make([]Suggestion, 0, len(payload.Results))
	for _, result := range payload.Results {
		if result.Formatted == "" {
			continue
		}
		name := result.Name
		if name == "" {
			name = result.Formatted
		}
		items = append(items, Suggestion{
			Provider:    "geoapify",
			ExternalID:  result.PlaceID,
			Name:        name,
			Description: result.Formatted,
			CountryCode: strings.ToUpper(result.CountryCode),
			Latitude:    result.Latitude,
			Longitude:   result.Longitude,
			ResultType:  result.ResultType,
		})
	}
	return items, nil
}

// Route returns the travel time (seconds) and road distance (meters) from
// one point to another by mode ("walk" or "drive"), without traffic.
func (c *GeoapifyClient) Route(ctx context.Context, from, to Point, mode string) (seconds, meters float64, err error) {
	if c.apiKey == "" {
		return 0, 0, ErrNotConfigured
	}
	endpoint, err := url.Parse(c.routingURL)
	if err != nil {
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: parse url: %w", err)
	}
	params := endpoint.Query()
	params.Set("waypoints", fmt.Sprintf("%f,%f|%f,%f", from.Lat, from.Lng, to.Lat, to.Lng))
	params.Set("mode", mode)
	params.Set("format", "json")
	params.Set("apiKey", c.apiKey)
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := c.do(req)
	if err != nil {
		// *url.Error carries the full URL, apiKey included: keep only the cause.
		var uerr *url.Error
		if errors.As(err, &uerr) {
			err = uerr.Err
		}
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		if resp.StatusCode == http.StatusBadRequest {
			return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: %w", ErrNoRoute)
		}
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: provider status %d", resp.StatusCode)
	}
	var payload struct {
		Results []struct {
			Distance float64 `json:"distance"`
			Time     float64 `json:"time"`
		} `json:"results"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&payload); err != nil {
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: decode response: %w", err)
	}
	if len(payload.Results) == 0 {
		return 0, 0, fmt.Errorf("location.GeoapifyClient.Route: %w", ErrNoRoute)
	}
	return payload.Results[0].Time, payload.Results[0].Distance, nil
}

// do sends the request, waiting and retrying (up to 3 times) when the
// provider rate-limits a burst of lookups with 429.
func (c *GeoapifyClient) do(req *http.Request) (*http.Response, error) {
	for attempt := 1; ; attempt++ {
		resp, err := c.client.Do(req)
		if err != nil || resp.StatusCode != http.StatusTooManyRequests || attempt > 3 {
			return resp, err
		}
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		resp.Body.Close()
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(time.Duration(attempt) * 400 * time.Millisecond):
		}
	}
}
