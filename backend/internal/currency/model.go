package currency

import (
	"errors"
	"time"
)

var ErrUnsupported = errors.New("unsupported currency")

type Rate struct {
	Base      string
	Target    string
	Rate      float64
	FetchedAt time.Time
}

type CurrencyInfo struct {
	Code   string
	Symbol string
}

// SupportedCurrencies is populated from config at startup.
// Use currency.IsSupported() to validate user input.
var SupportedCurrencies []string

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

func IsSupported(code string) bool {
	for _, c := range SupportedCurrencies {
		if c == code {
			return true
		}
	}
	return false
}
