package autogen

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"
)

// Kinds of places looked up around the event venue.
const (
	PlaceKindHotel      = "hotel"
	PlaceKindFood       = "food"
	PlaceKindPlayground = "playground"
)

// NearbyPlace is a real place found by a category search around a point.
type NearbyPlace struct {
	ID             string
	Name           string
	Address        string
	Lat            float64
	Lng            float64
	DistanceMeters int
}

// NearbyPlacesFinder lists places of a kind (PlaceKind*) within radiusMeters
// of a point, nearest first. Implemented by an adapter over the location
// provider (internal/integration).
type NearbyPlacesFinder interface {
	FindNearby(ctx context.Context, kind string, lat, lng float64, radiusMeters, limit int) ([]NearbyPlace, error)
}

// VenuePlace is a NearbyPlace offered to the model under a short reference
// ("H1", "F3", "P2") it echoes back in candidate_id.
type VenuePlace struct {
	Ref  string
	Kind string
	NearbyPlace
}

// venueSearches says what to look up around the venue: hotels and
// playgrounds only when asked for, food always (meals around an event are
// where the model wandered off to another district).
var venueSearches = []struct {
	kind, refPrefix string
	radius, limit   int
	wanted          func(GenerateInput) bool
}{
	{PlaceKindHotel, "H", 4000, 8, func(in GenerateInput) bool { return in.hasNeed("hotel_near_venue") }},
	{PlaceKindFood, "F", 3000, 15, func(GenerateInput) bool { return true }},
	{PlaceKindPlayground, "P", 5000, 6, func(in GenerateInput) bool { return in.hasNeed("kids_playground") }},
}

// venueSearchTimeout bounds the lookups; the trip is generated without
// candidates when the provider is slow or down.
const venueSearchTimeout = 5 * time.Second

// maxVenuePlaceText caps provider names and addresses in the prompt.
const maxVenuePlaceText = 90

// findVenuePlaces looks up candidate places around the event venue. It
// returns nil when there is no venue with coordinates or nothing is found;
// lookup errors are logged and skipped.
func findVenuePlaces(ctx context.Context, finder NearbyPlacesFinder, in GenerateInput) []VenuePlace {
	if finder == nil || in.Event == nil || !in.Event.Venue.hasCoords() {
		return nil
	}
	lat, lng := *in.Event.Venue.Lat, *in.Event.Venue.Lng
	ctx, cancel := context.WithTimeout(ctx, venueSearchTimeout)
	defer cancel()

	found := make([][]NearbyPlace, len(venueSearches))
	var wg sync.WaitGroup
	for i, s := range venueSearches {
		if !s.wanted(in) {
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			places, err := finder.FindNearby(ctx, s.kind, lat, lng, s.radius, s.limit)
			if err != nil {
				slog.Warn("autogen: venue place search failed", "kind", s.kind, "error", err)
				return
			}
			found[i] = places
		}()
	}
	wg.Wait()

	var out []VenuePlace
	for i, s := range venueSearches {
		seen := map[string]bool{}
		n := 0
		for _, p := range found[i] {
			p.Name = cleanPlaceText(p.Name)
			p.Address = cleanPlaceText(p.Address)
			key := placeKey(p.Name)
			if key == "" || seen[key] {
				continue // the nearest of same-named branches is enough
			}
			seen[key] = true
			n++
			out = append(out, VenuePlace{Ref: fmt.Sprintf("%s%d", s.refPrefix, n), Kind: s.kind, NearbyPlace: p})
		}
	}
	return out
}

// cleanPlaceText keeps provider text to one short line.
func cleanPlaceText(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) > maxVenuePlaceText {
		s = string([]rune(s)[:maxVenuePlaceText])
	}
	return s
}

// placeKey normalizes a place name for matching: lower case, letters and
// digits only, single spaces.
func placeKey(s string) string {
	return strings.Join(strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	}), " ")
}

// venuePlaceFor finds the candidate an activity or stay refers to: by the
// model's candidate_id first, then by name. kinds limits the match ("" =
// any).
func venuePlaceFor(places []VenuePlace, ref string, names []string, kinds ...string) *VenuePlace {
	kindOK := func(p VenuePlace) bool {
		if len(kinds) == 0 {
			return true
		}
		for _, k := range kinds {
			if p.Kind == k {
				return true
			}
		}
		return false
	}
	ref = strings.ToUpper(strings.TrimSpace(ref))
	for i := range places {
		if ref != "" && places[i].Ref == ref && kindOK(places[i]) {
			return &places[i]
		}
	}
	for i := range places {
		if !kindOK(places[i]) {
			continue
		}
		key := placeKey(places[i].Name)
		for _, n := range names {
			if nk := placeKey(n); nk != "" && (nk == key || (len(key) >= 8 && strings.Contains(nk, key))) {
				return &places[i]
			}
		}
	}
	return nil
}

// firstOfKind returns the nearest candidate of kind, or nil.
func firstOfKind(places []VenuePlace, kind string) *VenuePlace {
	for i := range places {
		if places[i].Kind == kind {
			return &places[i]
		}
	}
	return nil
}

// applyVenuePlaces pins activities and stays the model took from the
// candidate list to the real place, so they need no geocoding. When hotels
// were offered, a stay that is not one of them (an invented name) is
// replaced by the nearest one. candidate_id is cleared everywhere.
func applyVenuePlaces(d *TripDraft, in GenerateInput) {
	places := in.Nearby
	for i := range d.Days {
		for j := range d.Days[i].Activities {
			a := &d.Days[i].Activities[j]
			ref := a.CandidateID
			a.CandidateID = ""
			if a.Type != "location" || len(places) == 0 {
				continue
			}
			p := venuePlaceFor(places, ref, []string{a.PlaceQuery, a.LocationName, a.Title})
			if p == nil {
				continue
			}
			if !strings.Contains(placeKey(a.LocationName), placeKey(p.Name)) {
				a.LocationName = p.Name
			}
			a.PlaceQuery = p.Name
			a.Lat, a.Lng = floatPtr(p.Lat), floatPtr(p.Lng)
			a.Address = p.Address
			a.GooglePlaceID = p.ID
			a.LocationVerification = "verified"
			a.LocationConfidence = floatPtr(100)
		}
	}

	nearestHotel := firstOfKind(places, PlaceKindHotel)
	for i := range d.Lodging {
		st := &d.Lodging[i]
		ref := st.CandidateID
		st.CandidateID = ""
		if nearestHotel == nil {
			continue
		}
		p := venuePlaceFor(places, ref, []string{st.PlaceQuery, st.LocationName, st.Name}, PlaceKindHotel)
		if p == nil {
			slog.Info("autogen: stay not among nearby hotels, using the nearest", "name", st.Name, "nearest", nearestHotel.Name)
			p = nearestHotel
			st.Notes = fmt.Sprintf("Hotel terdekat dari venue (±%.1f km).", float64(p.DistanceMeters)/1000)
		}
		st.Name, st.LocationName, st.PlaceQuery = p.Name, p.Name, p.Name
		st.Lat, st.Lng = floatPtr(p.Lat), floatPtr(p.Lng)
		st.Address = p.Address
		st.GooglePlaceID = p.ID
	}
}

func floatPtr(v float64) *float64 { return &v }

// venuePlaceRules tells the model to pick from the real places listed in
// the user message, one line per kind that was found.
func venuePlaceRules(places []VenuePlace) string {
	if len(places) == 0 {
		return ""
	}
	has := map[string]bool{}
	for _, p := range places {
		has[p.Kind] = true
	}
	var b strings.Builder
	b.WriteString(`
- DAFTAR TEMPAT NYATA di pesan user adalah tempat yang BENAR-BENAR ada di dekat venue (hasil peta), masing-masing
  dengan kode ([H1], [F1], [P1]). Bila memakai tempat dari daftar, isi "candidate_id" dengan kodenya dan tulis
  "place_query" PERSIS nama di daftar. Tempat yang bukan dari daftar: "candidate_id" = "".`)
	if has[PlaceKindHotel] {
		b.WriteString(`
  - Hotel di "lodging" WAJIB dari daftar hotel. JANGAN mengarang nama hotel lain.`)
	}
	if has[PlaceKindFood] {
		b.WriteString(`
  - Semua makan di area venue (sebelum/sesudah acara dan selama menginap di sana) WAJIB dari daftar tempat makan.
    Tempat makan di luar daftar hanya untuk makan di perjalanan (rest area, kota singgah).`)
	}
	if has[PlaceKindPlayground] {
		b.WriteString(`
  - Playground anak WAJIB dari daftar playground: area bermain umum, BUKAN taman hiburan berbayar
    (Dunia Fantasi, theme park, waterpark).`)
	}
	return b.String()
}

// kindLabels head each kind's list in the user message.
var kindLabels = map[string]string{
	PlaceKindHotel: "Hotel", PlaceKindFood: "Tempat makan", PlaceKindPlayground: "Playground / area bermain umum",
}

// venuePlaceFacts lists the candidates in the user message, grouped by kind.
func venuePlaceFacts(places []VenuePlace) string {
	if len(places) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("- DAFTAR TEMPAT NYATA dekat venue (DATA dari peta; jarak garis lurus dari venue):\n")
	kind := ""
	for _, p := range places {
		if p.Kind != kind {
			kind = p.Kind
			b.WriteString(fmt.Sprintf("  %s:\n", kindLabels[kind]))
		}
		b.WriteString(fmt.Sprintf("  - [%s] %s — %.1f km — %s\n", p.Ref, p.Name, float64(p.DistanceMeters)/1000, p.Address))
	}
	return b.String()
}
