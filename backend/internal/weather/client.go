// Package weather serves daily forecasts from Open-Meteo (free, no API key),
// cached in Redis.
package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const forecastURL = "https://api.open-meteo.com/v1/forecast"

// Day is one day's forecast: WMO weather code and temperatures in °C.
type Day struct {
	Date        string  `json:"date"` // YYYY-MM-DD, local to the place
	WeatherCode int     `json:"weather_code"`
	TempMin     float64 `json:"temp_min"`
	TempMax     float64 `json:"temp_max"`
}

// Client calls the Open-Meteo forecast API.
type Client struct {
	baseURL string
	client  *http.Client
}

func NewClient() *Client {
	return &Client{baseURL: forecastURL, client: &http.Client{Timeout: 8 * time.Second}}
}

type forecastResponse struct {
	Daily struct {
		Time        []string   `json:"time"`
		WeatherCode []*int     `json:"weather_code"`
		TempMax     []*float64 `json:"temperature_2m_max"`
		TempMin     []*float64 `json:"temperature_2m_min"`
	} `json:"daily"`
}

// Daily returns the forecast at (lat, lng) for each day from start to end
// (YYYY-MM-DD, inclusive). Days the provider has no values for are left out.
func (c *Client) Daily(ctx context.Context, lat, lng float64, start, end string) ([]Day, error) {
	params := url.Values{}
	params.Set("latitude", strconv.FormatFloat(lat, 'f', 2, 64))
	params.Set("longitude", strconv.FormatFloat(lng, 'f', 2, 64))
	params.Set("daily", "weather_code,temperature_2m_max,temperature_2m_min")
	params.Set("timezone", "auto")
	params.Set("start_date", start)
	params.Set("end_date", end)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("weather.Client: create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("weather.Client: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("weather.Client: provider status %d", resp.StatusCode)
	}
	var payload forecastResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&payload); err != nil {
		return nil, fmt.Errorf("weather.Client: decode response: %w", err)
	}

	d := payload.Daily
	out := make([]Day, 0, len(d.Time))
	for i, date := range d.Time {
		if i >= len(d.WeatherCode) || i >= len(d.TempMax) || i >= len(d.TempMin) ||
			d.WeatherCode[i] == nil || d.TempMax[i] == nil || d.TempMin[i] == nil {
			continue
		}
		out = append(out, Day{Date: date, WeatherCode: *d.WeatherCode[i], TempMin: *d.TempMin[i], TempMax: *d.TempMax[i]})
	}
	return out, nil
}
