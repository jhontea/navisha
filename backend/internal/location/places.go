package location

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Place is one point of interest found by category (a hotel, restaurant or
// playground near a point). Name is empty for places OSM does not name.
type Place struct {
	ExternalID string
	Name       string
	Address    string
	Street     string
	Lat        float64
	Lng        float64
	// DistanceMeters is the distance from the search center.
	DistanceMeters int
	Categories     []string
}

type placesResponse struct {
	Features []struct {
		Properties struct {
			PlaceID    string   `json:"place_id"`
			Name       string   `json:"name"`
			Formatted  string   `json:"formatted"`
			Street     string   `json:"street"`
			Lat        float64  `json:"lat"`
			Lon        float64  `json:"lon"`
			Distance   float64  `json:"distance"`
			Categories []string `json:"categories"`
		} `json:"properties"`
	} `json:"features"`
}

// placesURL is the Places API endpoint on the same host as the geocoder
// (https://api.geoapify.com/v2/places for the default base URL).
func (c *GeoapifyClient) placesURL() (*url.URL, error) {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return nil, err
	}
	u.Path = "/v2/places"
	u.RawQuery = ""
	return u, nil
}

// SearchCategory lists places of the given Geoapify categories (e.g.
// "accommodation.hotel", "leisure.playground") within radiusMeters of
// center, nearest first.
func (c *GeoapifyClient) SearchCategory(ctx context.Context, categories []string, center Point, radiusMeters, limit int, language string) ([]Place, error) {
	if c.apiKey == "" {
		return nil, ErrNotConfigured
	}
	endpoint, err := c.placesURL()
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCategory: parse base url: %w", err)
	}
	params := url.Values{}
	params.Set("categories", strings.Join(categories, ","))
	params.Set("filter", fmt.Sprintf("circle:%f,%f,%d", center.Lng, center.Lat, radiusMeters))
	params.Set("bias", fmt.Sprintf("proximity:%f,%f", center.Lng, center.Lat))
	params.Set("limit", fmt.Sprint(limit))
	if language != "" {
		params.Set("lang", language)
	}
	params.Set("apiKey", c.apiKey)
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCategory: create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := c.do(req)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCategory: request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCategory: provider status %d", resp.StatusCode)
	}

	var payload placesResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.SearchCategory: decode response: %w", err)
	}
	items := make([]Place, 0, len(payload.Features))
	for _, f := range payload.Features {
		p := f.Properties
		if p.PlaceID == "" || p.Formatted == "" {
			continue
		}
		items = append(items, Place{
			ExternalID:     p.PlaceID,
			Name:           strings.TrimSpace(p.Name),
			Address:        p.Formatted,
			Street:         strings.TrimSpace(p.Street),
			Lat:            p.Lat,
			Lng:            p.Lon,
			DistanceMeters: int(p.Distance + 0.5),
			Categories:     p.Categories,
		})
	}
	return items, nil
}
