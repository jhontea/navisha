package currency

import (
	"errors"
	"time"
)

var ErrUnsupported = errors.New("unsupported currency")

// Rate represents a single exchange rate between two currencies.
type Rate struct {
	Base      string    // Source currency code (e.g. "USD")
	Target    string    // Target currency code (e.g. "IDR")
	Rate      float64   // Exchange rate: 1 Base = Rate Target
	FetchedAt time.Time // When the rate was last refreshed from upstream
}

// CurrencyInfo holds display metadata for a currency.
type CurrencyInfo struct {
	Code   string // ISO 4217 currency code (e.g. "IDR")
	Symbol string // Display symbol (e.g. "Rp")
}

// SupportedCurrencies is populated from config at startup.
// Use currency.IsSupported() to validate user input.
var SupportedCurrencies []string

// supportedSet is a pre-computed lookup for O(1) membership checks.
// Rebuilt whenever SupportedCurrencies is updated (at startup).
var supportedSet = map[string]struct{}{}

// UpdateSupportedSet rebuilds the lookup map from SupportedCurrencies.
// Call this after loading config.
func UpdateSupportedSet() {
	supportedSet = make(map[string]struct{}, len(SupportedCurrencies))
	for _, c := range SupportedCurrencies {
		supportedSet[c] = struct{}{}
	}
}

var symbols = map[string]string{
	"IDR": "Rp",
	"USD": "$",
	"JPY": "¥",
	"SGD": "S$",
	"KRW": "₩",
	"EUR": "€",
	"GBP": "£",
	"AUD": "A$",
	"MYR": "RM",
	"THB": "฿",
	"CNY": "¥",
	"VND": "₫",
}

var names = map[string]string{
	"IDR": "Indonesian Rupiah",
	"USD": "US Dollar",
	"JPY": "Japanese Yen",
	"SGD": "Singapore Dollar",
	"KRW": "South Korean Won",
	"EUR": "Euro",
	"GBP": "British Pound",
	"AUD": "Australian Dollar",
	"MYR": "Malaysian Ringgit",
	"THB": "Thai Baht",
	"CNY": "Chinese Yuan",
	"VND": "Vietnamese Dong",
}

func Symbol(code string) string {
	return symbols[code]
}

func Name(code string) string {
	if n, ok := names[code]; ok {
		return n
	}
	return code
}

// IsSupported reports whether code is in the supported currency list.
// It uses the O(1) map lookup when available, falling back to a linear scan
// if the map hasn't been initialized yet (e.g. in tests before UpdateSupportedSet is called).
func IsSupported(code string) bool {
	if len(supportedSet) > 0 {
		_, ok := supportedSet[code]
		return ok
	}
	// Fallback: linear scan (only hits when UpdateSupportedSet hasn't been called).
	for _, c := range SupportedCurrencies {
		if c == code {
			return true
		}
	}
	return false
}
