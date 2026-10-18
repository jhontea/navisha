package integration

import (
	"context"
	"fmt"

	"github.com/jhontea/navisha/backend/internal/autogen"
	"github.com/jhontea/navisha/backend/internal/location"
)

// categorySearcher is the part of location.GeoapifyClient the finder uses.
type categorySearcher interface {
	SearchCategory(ctx context.Context, categories []string, center location.Point, radiusMeters, limit int, language string) ([]location.Place, error)
}

// placeCategories maps autogen place kinds to Geoapify categories.
// Playgrounds are leisure.playground only: leisure.park also returns the
// zones inside paid theme parks (Dunia Fantasi's "Kawasan Eropa").
var placeCategories = map[string][]string{
	autogen.PlaceKindHotel:      {"accommodation.hotel", "accommodation.guest_house"},
	autogen.PlaceKindFood:       {"catering.restaurant", "catering.fast_food", "catering.cafe", "catering.food_court"},
	autogen.PlaceKindPlayground: {"leisure.playground"},
}

// AutogenPlaces finds real places around an event venue for trip drafts.
type AutogenPlaces struct {
	searcher categorySearcher
}

func NewAutogenPlaces(searcher categorySearcher) *AutogenPlaces {
	return &AutogenPlaces{searcher: searcher}
}

var _ autogen.NearbyPlacesFinder = (*AutogenPlaces)(nil)

// FindNearby lists named places of kind near the point. Hotels and food
// without a name are skipped; playgrounds are rarely named in OSM, so an
// unnamed one is called after its street.
func (a *AutogenPlaces) FindNearby(ctx context.Context, kind string, lat, lng float64, radiusMeters, limit int) ([]autogen.NearbyPlace, error) {
	categories, ok := placeCategories[kind]
	if !ok {
		return nil, fmt.Errorf("integration.AutogenPlaces.FindNearby: unknown kind %q", kind)
	}
	found, err := a.searcher.SearchCategory(ctx, categories, location.Point{Lat: lat, Lng: lng}, radiusMeters, limit, "id")
	if err != nil {
		return nil, fmt.Errorf("integration.AutogenPlaces.FindNearby: %w", err)
	}
	out := make([]autogen.NearbyPlace, 0, len(found))
	for _, p := range found {
		name := p.Name
		if name == "" && kind == autogen.PlaceKindPlayground && p.Street != "" {
			name = "Playground umum " + p.Street
		}
		if name == "" {
			continue
		}
		out = append(out, autogen.NearbyPlace{
			ID: p.ExternalID, Name: name, Address: p.Address,
			Lat: p.Lat, Lng: p.Lng, DistanceMeters: p.DistanceMeters,
		})
	}
	return out, nil
}
