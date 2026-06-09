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
}

func Symbol(code string) string {
	return symbols[code]
}

func IsSupported(code string) bool {
	for _, c := range SupportedCurrencies {
		if c == code {
			return true
		}
	}
	return false
}
