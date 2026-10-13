// Package money formats amounts for text meant to be read (LLM prompts),
// matching the frontend's formatMoney: no minor units for IDR/JPY/KRW/VND,
// two decimals otherwise, comma-grouped thousands.
package money

import (
	"math"
	"strconv"
	"strings"
)

var zeroDecimal = map[string]bool{"IDR": true, "JPY": true, "KRW": true, "VND": true}

// Decimals returns how many decimals are written for a currency.
func Decimals(currency string) int {
	if zeroDecimal[strings.ToUpper(currency)] {
		return 0
	}
	return 2
}

// Format returns e.g. "68,340,304 IDR" or "12.50 USD".
func Format(amount float64, currency string) string {
	if math.IsNaN(amount) || math.IsInf(amount, 0) {
		amount = 0
	}
	dec := Decimals(currency)
	s := strconv.FormatFloat(math.Abs(amount), 'f', dec, 64)
	intPart, frac := s, ""
	if i := strings.IndexByte(s, '.'); i >= 0 {
		intPart, frac = s[:i], s[i:]
	}
	var b strings.Builder
	for i, r := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	sign := ""
	if amount < 0 && strings.Trim(s, "0.") != "" {
		sign = "-"
	}
	return sign + b.String() + frac + " " + strings.ToUpper(currency)
}
