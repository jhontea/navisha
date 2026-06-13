package currency

import (
	"math"
	"testing"
)

// approxEqual checks two floats within a relative tolerance.
func approxEqual(a, b, tol float64) bool {
	if a == 0 && b == 0 {
		return true
	}
	return math.Abs(a-b)/math.Max(math.Abs(a), math.Abs(b)) < tol
}

func TestCrossRate(t *testing.T) {
	rates := map[string]float64{
		"USD": 1.0,
		"IDR": 15500.0,
		"JPY": 150.0,
		"SGD": 1.35,
	}
	tests := []struct {
		name   string
		base   string
		target string
		want   float64
		errOK  bool
	}{
		{"same currency", "IDR", "IDR", 1.0, false},
		{"USD to IDR", "USD", "IDR", 15500.0, false},
		{"IDR to USD", "IDR", "USD", 1.0 / 15500.0, false},
		{"IDR to JPY", "IDR", "JPY", 150.0 / 15500.0, false},
		{"JPY to IDR", "JPY", "IDR", 15500.0 / 150.0, false},
		{"USD same", "USD", "USD", 1.0, false},
		{"missing base", "EUR", "IDR", 0, true},
		{"missing target", "IDR", "EUR", 0, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := crossRate(rates, tc.base, tc.target)
			if tc.errOK {
				if err == nil {
					t.Fatalf("expected error, got rate=%v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("err: %v", err)
			}
			if !approxEqual(got, tc.want, 1e-9) {
				t.Errorf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func TestCrossRate_ZeroBase(t *testing.T) {
	rates := map[string]float64{"IDR": 0, "USD": 1.0}
	if _, err := crossRate(rates, "IDR", "USD"); err == nil {
		t.Error("expected error for zero base, got nil")
	}
}
