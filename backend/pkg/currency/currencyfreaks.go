// Package currency provides a thin HTTP client for the CurrencyFreaks API
// (https://currencyfreaks.com/). Free tier returns rates with USD as base;
// callers compute cross rates client-side.
package currency

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.currencyfreaks.com/v2.0"

type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		baseURL: defaultBaseURL,
		apiKey:  apiKey,
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

// rawResponse is the on-wire shape. Rates come in as strings.
type rawResponse struct {
	Date  string            `json:"date"`
	Base  string            `json:"base"`
	Rates map[string]string `json:"rates"`
}

// LatestRates is the parsed shape returned to callers.
// Base is always "USD" on the free tier.
type LatestRates struct {
	Date  time.Time
	Base  string
	Rates map[string]float64
}

// Latest fetches the latest USD-based rates for the requested symbols.
// If symbols is empty, the API returns rates for every supported currency.
func (c *Client) Latest(ctx context.Context, symbols []string) (*LatestRates, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("currency.Latest: api key required")
	}

	u, err := url.Parse(c.baseURL + "/rates/latest")
	if err != nil {
		return nil, fmt.Errorf("currency.Latest: parse base URL: %w", err)
	}
	q := u.Query()
	q.Set("apikey", c.apiKey)
	if len(symbols) > 0 {
		upper := make([]string, 0, len(symbols))
		for _, s := range symbols {
			upper = append(upper, strings.ToUpper(s))
		}
		q.Set("symbols", strings.Join(upper, ","))
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("currency.Latest req: %w", err)
	}

	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("currency.Latest do: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("currency.Latest: status %d", res.StatusCode)
	}

	var raw rawResponse
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("currency.Latest decode: %w", err)
	}

	rates := make(map[string]float64, len(raw.Rates))
	for k, v := range raw.Rates {
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			// Skip malformed entries instead of aborting the whole response.
			continue
		}
		rates[k] = f
	}

	// CurrencyFreaks date format: "2023-03-21 12:43:00+00"
	t, err := time.Parse("2006-01-02 15:04:05-07", raw.Date)
	if err != nil {
		return nil, fmt.Errorf("currency.Latest: parse date %q: %w", raw.Date, err)
	}

	base := raw.Base
	if base == "" {
		base = "USD"
	}
	return &LatestRates{Date: t, Base: base, Rates: rates}, nil
}
