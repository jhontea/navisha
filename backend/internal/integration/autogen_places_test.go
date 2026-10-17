package integration

import (
	"context"
	"strings"
	"testing"

	"github.com/ahmadhafizh/navisha/backend/internal/autogen"
	"github.com/ahmadhafizh/navisha/backend/internal/location"
)

type fakeCategorySearcher struct {
	categories []string
	places     []location.Place
}

func (f *fakeCategorySearcher) SearchCategory(_ context.Context, categories []string, _ location.Point, _, _ int, _ string) ([]location.Place, error) {
	f.categories = categories
	return f.places, nil
}

func TestAutogenPlaces_FindNearby(t *testing.T) {
	searcher := &fakeCategorySearcher{places: []location.Place{
		{ExternalID: "a", Name: "Taman Bermain Anak", DistanceMeters: 500},
		{ExternalID: "b", Street: "Jalan GOR Kecamatan Pademangan", DistanceMeters: 1278},
		{ExternalID: "c"}, // no name, no street
	}}
	finder := NewAutogenPlaces(searcher)

	got, err := finder.FindNearby(context.Background(), autogen.PlaceKindPlayground, -6.12, 106.84, 5000, 6)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(searcher.categories, ",") != "leisure.playground" {
		t.Errorf("categories = %v", searcher.categories)
	}
	if len(got) != 2 || got[1].Name != "Playground umum Jalan GOR Kecamatan Pademangan" || got[1].DistanceMeters != 1278 {
		t.Errorf("playgrounds = %+v", got)
	}

	// Unnamed hotels are not offered.
	got, _ = finder.FindNearby(context.Background(), autogen.PlaceKindHotel, -6.12, 106.84, 4000, 8)
	if len(got) != 1 || got[0].ID != "a" {
		t.Errorf("hotels = %+v", got)
	}

	if _, err := finder.FindNearby(context.Background(), "spa", 0, 0, 1, 1); err == nil {
		t.Error("want an error for an unknown kind")
	}
}
