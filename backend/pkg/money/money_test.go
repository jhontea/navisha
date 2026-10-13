package money

import "testing"

func TestFormat(t *testing.T) {
	tests := []struct {
		amount   float64
		currency string
		want     string
	}{
		{68340303.69, "IDR", "68,340,304 IDR"},
		{65000000, "idr", "65,000,000 IDR"},
		{1200, "JPY", "1,200 JPY"},
		{999, "KRW", "999 KRW"},
		{12.5, "USD", "12.50 USD"},
		{1234567.891, "EUR", "1,234,567.89 EUR"},
		{-3340303.69, "IDR", "-3,340,304 IDR"},
		{-0.001, "USD", "0.00 USD"},
		{0, "IDR", "0 IDR"},
	}
	for _, tt := range tests {
		if got := Format(tt.amount, tt.currency); got != tt.want {
			t.Errorf("Format(%v, %q) = %q, want %q", tt.amount, tt.currency, got, tt.want)
		}
	}
}
