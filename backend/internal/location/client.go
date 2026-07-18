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

type Suggestion struct {
	Provider    string  `json:"provider"`
	ExternalID  string  `json:"external_id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	CountryCode string  `json:"country_code"`
	Latitude    float64 `json:"lat"`
	Longitude   float64 `json:"lng"`
}

type AutocompleteClient interface {
	Autocomplete(ctx context.Context, query, kind, language string) ([]Suggestion, error)
}

type GeoapifyClient struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewGeoapifyClient(apiKey, baseURL string, timeout time.Duration) *GeoapifyClient {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.geoapify.com/v1/geocode/autocomplete"
	}
	if timeout <= 0 {
		timeout = 8 * time.Second
	}
	return &GeoapifyClient{
		apiKey:  strings.TrimSpace(apiKey),
		baseURL: strings.TrimSpace(baseURL),
		client:  &http.Client{Timeout: timeout},
	}
}

type geoapifyResponse struct {
	Results []struct {
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
	params.Set("format", "json")
	params.Set("limit", "6")
	params.Set("apiKey", c.apiKey)
	if language != "" {
		params.Set("lang", language)
	}
	endpoint.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.Autocomplete: create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.Autocomplete: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("location.GeoapifyClient.Autocomplete: provider status %d", resp.StatusCode)
	}

	var payload geoapifyResponse
	decoder := json.NewDecoder(io.LimitReader(resp.Body, 1<<20))
	if err := decoder.Decode(&payload); err != nil {
		return nil, fmt.Errorf("location.GeoapifyClient.Autocomplete: decode response: %w", err)
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
		})
	}
	return items, nil
}
