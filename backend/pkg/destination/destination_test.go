package destination

import "testing"

func TestIsIndonesia(t *testing.T) {
	tests := []struct {
		in   string
		want bool
	}{
		{"Bali, Indonesia", true},
		{"Ubud", true},
		{"Bandung City, West Java, Indonesia", true},
		{"Labuan Bajo, Flores", true},
		{"Special Capital Region of Jakarta, Java, Indonesia", true},
		{"Japan", false},
		{"Tokyo, Japan", false},
		{"Kuala Lumpur, Malaysia", false},
		// Whole-word match: "Solothurn" must not match "solo", "Batumi" not "batu".
		{"Solothurn, Switzerland", false},
		{"Batumi, Georgia", false},
		{"", false},
	}
	for _, tt := range tests {
		if got := IsIndonesia(tt.in); got != tt.want {
			t.Errorf("IsIndonesia(%q) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
