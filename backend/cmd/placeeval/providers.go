package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jhontea/navisha/backend/internal/location"
)

// place is one search result, reduced to what the comparison needs.
type place struct {
	Name    string  `json:"name"`
	Address string  `json:"address"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
}

// provider searches places in Indonesia, ranking those near bias first.
type provider struct {
	Name string
	// EnvKey is the variable holding the provider's key; the provider is
	// skipped when it is empty.
	EnvKey string
	Search func(ctx context.Context, key, query string, bias area) ([]place, error)
}

const maxResults = 5

var providers = []provider{
	{Name: "geoapify", EnvKey: "GEOAPIFY_API_KEY", Search: searchGeoapify},
	{Name: "google", EnvKey: "GOOGLE_MAPS_API_KEY", Search: searchGoogle},
	{Name: "foursquare", EnvKey: "FOURSQUARE_API_KEY", Search: searchFoursquare},
	{Name: "mapbox", EnvKey: "MAPBOX_ACCESS_TOKEN", Search: searchMapbox},
	{Name: "tomtom", EnvKey: "TOMTOM_API_KEY", Search: searchTomTom},
	{Name: "here", EnvKey: "HERE_API_KEY", Search: searchHERE},
}

func providerKey(p provider) string { return strings.TrimSpace(os.Getenv(p.EnvKey)) }

var httpClient = &http.Client{Timeout: 10 * time.Second}

// searchGeoapify uses the app's own client and the same country-wide,
// proximity-biased search the location resolver falls back to.
func searchGeoapify(ctx context.Context, key, query string, bias area) ([]place, error) {
	client := location.NewGeoapifyClient(key, "", 10*time.Second)
	items, err := client.SearchCountry(ctx, query, "id", "id", location.Point{Lat: bias.Lat, Lng: bias.Lng})
	if err != nil {
		return nil, err
	}
	out := make([]place, 0, len(items))
	for _, it := range items {
		out = append(out, place{Name: it.Name, Address: it.Description, Lat: it.Latitude, Lng: it.Longitude})
	}
	return out, nil
}

// searchGoogle calls Places API (New) Text Search. displayName makes it a
// Pro request (5,000 free a month at the time of writing).
func searchGoogle(ctx context.Context, key, query string, bias area) ([]place, error) {
	body, _ := json.Marshal(map[string]any{
		"textQuery":    query,
		"languageCode": "id",
		"regionCode":   "ID",
		"pageSize":     maxResults,
		"locationBias": map[string]any{"circle": map[string]any{"center": map[string]float64{"latitude": bias.Lat, "longitude": bias.Lng}, "radius": 50000.0}},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://places.googleapis.com/v1/places:searchText", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", key)
	req.Header.Set("X-Goog-FieldMask", "places.displayName,places.formattedAddress,places.location")
	var resp struct {
		Places []struct {
			DisplayName struct {
				Text string `json:"text"`
			} `json:"displayName"`
			FormattedAddress string `json:"formattedAddress"`
			Location         struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			} `json:"location"`
		} `json:"places"`
	}
	if err := doJSON(req, &resp); err != nil {
		return nil, err
	}
	out := make([]place, 0, len(resp.Places))
	for _, p := range resp.Places {
		out = append(out, place{Name: p.DisplayName.Text, Address: p.FormattedAddress, Lat: p.Location.Latitude, Lng: p.Location.Longitude})
	}
	return out, nil
}

// searchFoursquare calls the Places API. Service keys use the current
// places-api host; legacy "fsq3…" keys use the v3 host.
func searchFoursquare(ctx context.Context, key, query string, bias area) ([]place, error) {
	params := url.Values{
		"query":  {query},
		"ll":     {fmt.Sprintf("%f,%f", bias.Lat, bias.Lng)},
		"radius": {"50000"},
		"limit":  {fmt.Sprint(maxResults)},
	}
	legacy := strings.HasPrefix(key, "fsq3")
	endpoint := "https://places-api.foursquare.com/places/search?"
	if legacy {
		endpoint = "https://api.foursquare.com/v3/places/search?"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if legacy {
		req.Header.Set("Authorization", key)
	} else {
		req.Header.Set("Authorization", "Bearer "+key)
		req.Header.Set("X-Places-Api-Version", "2025-06-17")
	}
	var resp struct {
		Results []struct {
			Name      string  `json:"name"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			Geocodes  struct {
				Main struct {
					Latitude  float64 `json:"latitude"`
					Longitude float64 `json:"longitude"`
				} `json:"main"`
			} `json:"geocodes"`
			Location struct {
				FormattedAddress string `json:"formatted_address"`
			} `json:"location"`
		} `json:"results"`
	}
	if err := doJSON(req, &resp); err != nil {
		return nil, err
	}
	out := make([]place, 0, len(resp.Results))
	for _, r := range resp.Results {
		lat, lng := r.Latitude, r.Longitude
		if lat == 0 && lng == 0 {
			lat, lng = r.Geocodes.Main.Latitude, r.Geocodes.Main.Longitude
		}
		out = append(out, place{Name: r.Name, Address: r.Location.FormattedAddress, Lat: lat, Lng: lng})
	}
	return out, nil
}

// searchMapbox calls Search Box /forward (POIs, addresses and places).
func searchMapbox(ctx context.Context, key, query string, bias area) ([]place, error) {
	params := url.Values{
		"q":            {query},
		"access_token": {key},
		"country":      {"id"},
		"language":     {"id"},
		"proximity":    {fmt.Sprintf("%f,%f", bias.Lng, bias.Lat)},
		"limit":        {fmt.Sprint(maxResults)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.mapbox.com/search/searchbox/v1/forward?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Features []struct {
			Geometry struct {
				Coordinates []float64 `json:"coordinates"`
			} `json:"geometry"`
			Properties struct {
				Name        string `json:"name"`
				FullAddress string `json:"full_address"`
			} `json:"properties"`
		} `json:"features"`
	}
	if err := doJSON(req, &resp); err != nil {
		return nil, err
	}
	out := make([]place, 0, len(resp.Features))
	for _, f := range resp.Features {
		if len(f.Geometry.Coordinates) < 2 {
			continue
		}
		out = append(out, place{Name: f.Properties.Name, Address: f.Properties.FullAddress, Lat: f.Geometry.Coordinates[1], Lng: f.Geometry.Coordinates[0]})
	}
	return out, nil
}

// searchTomTom calls Search API fuzzy search.
func searchTomTom(ctx context.Context, key, query string, bias area) ([]place, error) {
	params := url.Values{
		"key":        {key},
		"countrySet": {"ID"},
		"language":   {"id-ID"},
		"lat":        {fmt.Sprint(bias.Lat)},
		"lon":        {fmt.Sprint(bias.Lng)},
		"limit":      {fmt.Sprint(maxResults)},
	}
	endpoint := "https://api.tomtom.com/search/2/search/" + url.PathEscape(query) + ".json?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Results []struct {
			POI *struct {
				Name string `json:"name"`
			} `json:"poi"`
			Address struct {
				FreeformAddress string `json:"freeformAddress"`
			} `json:"address"`
			Position struct {
				Lat float64 `json:"lat"`
				Lon float64 `json:"lon"`
			} `json:"position"`
		} `json:"results"`
	}
	if err := doJSON(req, &resp); err != nil {
		return nil, err
	}
	out := make([]place, 0, len(resp.Results))
	for _, r := range resp.Results {
		name := r.Address.FreeformAddress
		if r.POI != nil && r.POI.Name != "" {
			name = r.POI.Name
		}
		out = append(out, place{Name: name, Address: r.Address.FreeformAddress, Lat: r.Position.Lat, Lng: r.Position.Lon})
	}
	return out, nil
}

// searchHERE calls Geocoding & Search /discover.
func searchHERE(ctx context.Context, key, query string, bias area) ([]place, error) {
	params := url.Values{
		"q":      {query},
		"at":     {fmt.Sprintf("%f,%f", bias.Lat, bias.Lng)},
		"in":     {"countryCode:IDN"},
		"lang":   {"id"},
		"limit":  {fmt.Sprint(maxResults)},
		"apiKey": {key},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://discover.search.hereapi.com/v1/discover?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Items []struct {
			Title   string `json:"title"`
			Address struct {
				Label string `json:"label"`
			} `json:"address"`
			Position struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"position"`
		} `json:"items"`
	}
	if err := doJSON(req, &resp); err != nil {
		return nil, err
	}
	out := make([]place, 0, len(resp.Items))
	for _, it := range resp.Items {
		out = append(out, place{Name: it.Title, Address: it.Address.Label, Lat: it.Position.Lat, Lng: it.Position.Lng})
	}
	return out, nil
}

func doJSON(req *http.Request, out any) error {
	resp, err := httpClient.Do(req)
	if err != nil {
		// url.Error repeats the full URL, which holds the key for some providers.
		var uerr *url.Error
		if errors.As(err, &uerr) {
			err = uerr.Err
		}
		return fmt.Errorf("%s: %w", req.URL.Host, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, truncate(strings.TrimSpace(string(body)), 200))
	}
	return json.Unmarshal(body, out)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
