package main

import (
	"context"
	"testing"
)

type fakeReverser map[[2]float64]string

func (f fakeReverser) ReverseGeocode(_ context.Context, lat, lng float64) (string, string, bool) {
	addr, ok := f[[2]float64{lat, lng}]
	return addr, "ID", ok
}

func TestPlan(t *testing.T) {
	geo := fakeReverser{
		{-6.117791, 106.858039}: "Ombak Laut, Pademangan, North Jakarta 14430, Java, Indonesia",
		{-6.9, 107.6}:           "-6.9, 107.6", // provider echoing coordinates is no better
	}
	items := []activity{
		{ID: "fan", Address: "-6.117791, 106.858039", Lat: -6.117791, Lng: 106.858039},
		{ID: "real", Address: "Jalan Lodan Timur, Ancol", Lat: -6.1, Lng: 106.8},
		{ID: "unknown", Address: "-6.735603,108.263293", Lat: -6.735603, Lng: 108.263293},
		{ID: "echo", Address: "-6.9, 107.6", Lat: -6.9, Lng: 107.6},
	}
	updates, skipped := plan(context.Background(), geo, items)

	if len(updates) != 1 || updates[0].ID != "fan" || updates[0].NewAddress != "Ombak Laut, Pademangan, North Jakarta 14430, Java, Indonesia" {
		t.Fatalf("updates = %#v", updates)
	}
	if len(skipped) != 2 || skipped[0].ID != "unknown" || skipped[1].ID != "echo" {
		t.Fatalf("skipped = %#v, want unknown and echo (a real address is not touched)", skipped)
	}
}
