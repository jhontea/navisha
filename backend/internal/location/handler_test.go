package location

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/labstack/echo/v4"
)

type fakeAutocompleteClient struct {
	items []Suggestion
	err   error
}

func (f fakeAutocompleteClient) Autocomplete(context.Context, string, string, string) ([]Suggestion, error) {
	return f.items, f.err
}

func TestHandlerAutocomplete(t *testing.T) {
	e := echo.New()
	handler := NewHandler(fakeAutocompleteClient{items: []Suggestion{{
		Provider: "geoapify", ExternalID: "1", Name: "Jakarta", Description: "Jakarta, Indonesia",
	}}})
	req := httptest.NewRequest(http.MethodGet, "/locations/autocomplete?query=Jakarta&kind=region", nil)
	rec := httptest.NewRecorder()

	if err := handler.Autocomplete(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Autocomplete() error = %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var body struct {
		Suggestions []Suggestion `json:"suggestions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Suggestions) != 1 || body.Suggestions[0].Name != "Jakarta" {
		t.Fatalf("suggestions = %#v", body.Suggestions)
	}
}

func TestHandlerAutocompleteRejectsShortQuery(t *testing.T) {
	e := echo.New()
	handler := NewHandler(fakeAutocompleteClient{})
	req := httptest.NewRequest(http.MethodGet, "/locations/autocomplete?query=Ja", nil)
	rec := httptest.NewRecorder()

	err := handler.Autocomplete(e.NewContext(req, rec))
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusBadRequest {
		t.Fatalf("Autocomplete() error = %#v", err)
	}
}

func TestHandlerResolveBatchesPlaces(t *testing.T) {
	e := echo.New()
	handler := NewHandler(fakeAutocompleteClient{items: []Suggestion{{
		Provider: "geoapify", ExternalID: "1", Name: "Resolved place",
	}}})
	req := httptest.NewRequest(
		http.MethodPost,
		"/locations/resolve",
		strings.NewReader(`{"destination":"Bali","items":[{"key":"one","name":"Ubud Palace"},{"key":"two","name":"Uluwatu Temple"}]}`),
	)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()

	if err := handler.Resolve(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Resolve() error = %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var body struct {
		Results map[string][]Suggestion `json:"results"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Results) != 2 || len(body.Results["one"]) != 1 || len(body.Results["two"]) != 1 {
		t.Fatalf("results = %#v", body.Results)
	}
}

func TestHandlerResolveRejectsDuplicateKeys(t *testing.T) {
	e := echo.New()
	handler := NewHandler(fakeAutocompleteClient{})
	req := httptest.NewRequest(
		http.MethodPost,
		"/locations/resolve",
		strings.NewReader(`{"items":[{"key":"same","name":"First place"},{"key":"same","name":"Second place"}]}`),
	)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)

	err := handler.Resolve(e.NewContext(req, httptest.NewRecorder()))
	httpErr, ok := err.(*echo.HTTPError)
	if !ok || httpErr.Code != http.StatusBadRequest {
		t.Fatalf("Resolve() error = %#v", err)
	}
}

type fakeNearClient struct {
	fakeAutocompleteClient
	cities  map[string]*Point
	near    map[string][]Suggestion // by query text
	mu      sync.Mutex
	queries []string
}

// record notes a query; Resolve searches from several goroutines.
func (f *fakeNearClient) record(query string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.queries = append(f.queries, query)
}

func (f *fakeNearClient) SearchNear(_ context.Context, query, _ string, _ Point, _ int) ([]Suggestion, error) {
	f.record(query)
	return f.near[query], nil
}

func (f *fakeNearClient) CityCenter(_ context.Context, city, _ string) (*Point, error) {
	return f.cities[strings.ToLower(city)], nil
}

func postResolve(t *testing.T, h *Handler, body string) map[string][]Suggestion {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/locations/resolve", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	if err := h.Resolve(echo.New().NewContext(req, rec)); err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	var out struct {
		Results map[string][]Suggestion `json:"results"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out.Results
}

func TestResolve_SearchesAroundTheCityWithNameVariants(t *testing.T) {
	client := &fakeNearClient{
		cities: map[string]*Point{"medina": {Lat: 24.47, Lng: 39.61}},
		near: map[string][]Suggestion{
			"Al-Masjid an-Nabawi, Medina": {{ExternalID: "p1", Name: "Prophet's Mosque", NearCity: true}},
			"Masjid Nabawi":               {{ExternalID: "p1", Name: "Prophet's Mosque", NearCity: true}, {ExternalID: "p2", Name: "Gate 21"}},
		},
	}
	h := NewHandler(client)
	got := postResolve(t, h, `{"destination":"Umroh","items":[{"key":"a","name":"Al-Masjid an-Nabawi","alt_name":"Masjid Nabawi","city":"Medina"}]}`)
	if len(got["a"]) != 2 || got["a"][0].Name != "Prophet's Mosque" {
		t.Fatalf("results = %+v (want the merged, de-duplicated candidates)", got["a"])
	}
	want := []string{"Al-Masjid an-Nabawi", "Al-Masjid an-Nabawi, Medina", "Masjid Nabawi"}
	if strings.Join(client.queries, "|") != strings.Join(want, "|") {
		t.Errorf("queries = %v, want %v", client.queries, want)
	}
}

func TestResolve_FallsBackToPlainSearchWhenNoAreaIsKnown(t *testing.T) {
	client := &fakeNearClient{
		fakeAutocompleteClient: fakeAutocompleteClient{items: []Suggestion{{Name: "Somewhere"}}},
		cities:                 map[string]*Point{},
	}
	h := NewHandler(client)
	got := postResolve(t, h, `{"destination":"Nowhere","items":[{"key":"a","name":"Somewhere","city":"Atlantis"}]}`)
	if len(got["a"]) != 1 || len(client.queries) != 0 {
		t.Fatalf("results = %+v, near queries = %v", got["a"], client.queries)
	}
}

func TestResolve_AcceptsALongItinerary(t *testing.T) {
	client := &fakeNearClient{cities: map[string]*Point{}}
	h := NewHandler(client)
	var items []string
	for i := 0; i < 60; i++ {
		items = append(items, `{"key":"k`+strings.Repeat("x", i)+`","name":"Place"}`)
	}
	got := postResolve(t, h, `{"items":[`+strings.Join(items, ",")+`]}`)
	if len(got) != 60 {
		t.Fatalf("got %d results, want 60", len(got))
	}
}

// A namesake city can put the search circle in the wrong place; when only
// area results come back, the trip destination is tried next.
type areaThenPlaceClient struct {
	fakeNearClient
}

func (f *areaThenPlaceClient) SearchNear(_ context.Context, query, _ string, center Point, _ int) ([]Suggestion, error) {
	f.record(query)
	if center.Lat == 1 { // the wrong "Lembang"
		return []Suggestion{{Name: "Lembang", ResultType: "city", NearCity: true}}, nil
	}
	return []Suggestion{{ExternalID: "fm", Name: "Floating Market Lembang", ResultType: "amenity", NearCity: true}}, nil
}

func TestResolve_TriesTheDestinationWhenTheCityGivesOnlyAreas(t *testing.T) {
	client := &areaThenPlaceClient{fakeNearClient{cities: map[string]*Point{
		"lembang, indonesia": {Lat: 1, Lng: 1},
		"bandung, indonesia": {Lat: -6.9, Lng: 107.6},
	}}}
	h := NewHandler(client)
	got := postResolve(t, h, `{"destination":"Bandung","items":[{"key":"a","name":"Floating Market Lembang","city":"Lembang, Indonesia"}]}`)
	if len(got["a"]) != 1 || got["a"][0].ExternalID != "fm" {
		t.Fatalf("results = %+v, want the place found around the destination", got["a"])
	}
}

func TestDistanceKm(t *testing.T) {
	// Mecca to Medina is about 340 km.
	if d := distanceKm(Point{Lat: 21.42, Lng: 39.83}, Point{Lat: 24.47, Lng: 39.61}); d < 330 || d > 350 {
		t.Errorf("distance = %.0f km", d)
	}
}

// Places found around the city anchor the trip; a place with nothing, or with
// a namesake far away, is searched again around them.
type anchorClient struct {
	fakeNearClient
}

func (f *anchorClient) SearchNear(_ context.Context, query, _ string, center Point, _ int) ([]Suggestion, error) {
	f.record(query)
	switch {
	case query == "Seminyak Village" && center.Lat > 20: // around the "Bali" in Taiwan
		return []Suggestion{{ExternalID: "tw", Name: "Seminary", ResultType: "amenity", NearCity: true, Latitude: 25.1, Longitude: 121.4}}, nil
	case query == "Seminyak Village":
		return []Suggestion{{ExternalID: "sv", Name: "Seminyak Village", ResultType: "amenity", NearCity: true, Latitude: -8.69, Longitude: 115.16}}, nil
	case query == "Melasti Beach" && center.Lat < -8: // only around the found places
		return []Suggestion{{ExternalID: "mb", Name: "Melasti Beach", ResultType: "amenity", NearCity: true, Latitude: -8.85, Longitude: 115.16}}, nil
	case strings.HasPrefix(query, "Ubud") || strings.HasPrefix(query, "Tegallalang"):
		return []Suggestion{{ExternalID: query, Name: query, ResultType: "amenity", NearCity: true, Latitude: -8.5, Longitude: 115.26}}, nil
	}
	return []Suggestion{{Name: "Badung", ResultType: "city", NearCity: true}}, nil
}

func TestResolve_RetriesAroundThePlacesAlreadyFound(t *testing.T) {
	client := &anchorClient{fakeNearClient{cities: map[string]*Point{
		"ubud, bali, indonesia":   {Lat: -8.5, Lng: 115.26},
		"badung, bali, indonesia": {Lat: -7.1, Lng: 113.4}, // the wrong Badung
		"bali":                    {Lat: 25.1, Lng: 121.4}, // Bali District, Taiwan
	}}}
	h := NewHandler(client)
	got := postResolve(t, h, `{"destination":"Bali","items":[
		{"key":"u1","name":"Ubud Palace","city":"Ubud, Bali, Indonesia"},
		{"key":"u2","name":"Tegallalang Rice Terraces","city":"Ubud, Bali, Indonesia"},
		{"key":"m","name":"Melasti Beach","city":"Badung, Bali, Indonesia"},
		{"key":"s","name":"Seminyak Village","city":"Badung, Bali, Indonesia"}]}`)
	if len(got["m"]) == 0 || got["m"][0].ExternalID != "mb" {
		t.Errorf("Melasti = %+v, want the beach found around the other places", got["m"])
	}
	if len(got["s"]) == 0 || got["s"][0].ExternalID != "sv" {
		t.Errorf("Seminyak = %+v, want the Bali result, not the Taiwan namesake", got["s"])
	}
}

func TestQueryVariants_DropsTheCityWordIncludingAlternateSpellings(t *testing.T) {
	got := queryVariants(resolveItem{name: "Anjum Hotel Makkah", altName: "Hotel Anjum Makkah", city: "Mecca, Saudi Arabia"})
	want := []string{"Anjum Hotel Makkah", "Anjum Hotel", "Anjum Hotel Makkah, Mecca, Saudi Arabia", "Hotel Anjum Makkah", "Hotel Anjum"}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Errorf("variants = %q, want %q", got, want)
	}
}

// The city word in the first query ranks other hotels first; the search goes
// on until a result's name matches, and the match is put first.
func TestResolve_KeepsSearchingUntilTheNameMatches(t *testing.T) {
	others := []Suggestion{
		{ExternalID: "1", Name: "Le Meridien Makkah Hotel", ResultType: "amenity", NearCity: true},
		{ExternalID: "2", Name: "Hotel Pullmann ZamZam Makkah", ResultType: "amenity", NearCity: true},
		{ExternalID: "3", Name: "Makkah Millennium Hotel", ResultType: "amenity", NearCity: true},
	}
	client := &fakeNearClient{
		cities: map[string]*Point{"mecca, saudi arabia": {Lat: 21.42, Lng: 39.83}},
		near: map[string][]Suggestion{
			"Anjum Hotel Makkah": others,
			"Anjum Hotel":        {{ExternalID: "anjum", Name: "Anjum Hotel", ResultType: "amenity", NearCity: true}},
		},
	}
	got := postResolve(t, NewHandler(client), `{"items":[{"key":"a","name":"Anjum Hotel Makkah","city":"Mecca, Saudi Arabia"}]}`)
	if len(got["a"]) == 0 || got["a"][0].ExternalID != "anjum" {
		t.Fatalf("results = %+v, want Anjum Hotel first", got["a"])
	}
	if len(client.queries) != 2 {
		t.Errorf("queries = %v, want to stop once the name matched", client.queries)
	}
}

// Makkah and Madinah are 340 km apart: a Makkah place that found nothing is
// never searched again around the Madinah places.
type twoCityClient struct {
	fakeNearClient
}

func (f *twoCityClient) SearchNear(_ context.Context, query, _ string, center Point, _ int) ([]Suggestion, error) {
	f.record(query)
	if center.Lat > 24 { // around Madinah
		if strings.Contains(query, "Haram") {
			return []Suggestion{{ExternalID: "bani", Name: "Masjid Bani Haram", ResultType: "amenity", NearCity: true, Latitude: 24.47, Longitude: 39.6}}, nil
		}
		return []Suggestion{{ExternalID: query, Name: query, ResultType: "amenity", NearCity: true, Latitude: 24.47, Longitude: 39.61}}, nil
	}
	return nil, nil // nothing found around Makkah
}

func TestResolve_NeverRetriesOneCityAroundAnother(t *testing.T) {
	client := &twoCityClient{fakeNearClient{cities: map[string]*Point{
		"mecca, saudi arabia":  {Lat: 21.42, Lng: 39.83},
		"medina, saudi arabia": {Lat: 24.47, Lng: 39.61},
	}}}
	got := postResolve(t, NewHandler(client), `{"items":[
		{"key":"n","name":"Nabawi","city":"Medina, Saudi Arabia"},
		{"key":"q","name":"Quba","city":"Medina, Saudi Arabia"},
		{"key":"h","name":"Masjid al-Haram","city":"Mecca, Saudi Arabia"}]}`)
	for _, s := range got["h"] {
		if s.ExternalID == "bani" {
			t.Fatal("a Makkah place was matched to a Madinah namesake")
		}
	}
}

func TestNameMatching(t *testing.T) {
	names := resolveItem{name: "Masjid al-Haram", altName: "Masjidil Haram", city: "Mecca, Saudi Arabia"}.names()
	mosque := Suggestion{Name: "Al Masjid al Ḩarām", ResultType: "amenity"}
	road := Suggestion{Name: "Al Masjid Al Haram Road", ResultType: "amenity"}
	if resultScore(mosque, names) < goodNameMatch {
		t.Errorf("diacritics must not hide a match: %.2f", resultScore(mosque, names))
	}
	if resultScore(road, names) >= resultScore(mosque, names) {
		t.Error("a road named after the mosque must rank below the mosque")
	}
	if nameMatch("Makkah Millennium Hotel", resolveItem{name: "Anjum Hotel Makkah", city: "Mecca, Saudi Arabia"}.names()) >= goodNameMatch {
		t.Error("a shared city word and \"hotel\" are not a match")
	}
}

func TestInRegion(t *testing.T) {
	cases := []struct {
		address, city string
		want          bool
	}{
		{"Canggu, Lampung, Indonesia", "Canggu, Bali, Indonesia", false},
		{"Seminyak, Kuta, Bali, Indonesia", "Seminyak, Bali, Indonesia", true},
		{"Lembang, West Java, Indonesia", "Lembang, West Java, Indonesia", true},
		{"Medina, Medina Province, Saudi Arabia", "Medina, Saudi Arabia", true},
	}
	for _, c := range cases {
		if got := inRegion(c.address, c.city); got != c.want {
			t.Errorf("inRegion(%q, %q) = %v, want %v", c.address, c.city, got, c.want)
		}
	}
}

func TestInRegion_ChecksTheCountry(t *testing.T) {
	if inRegion("Bali District, New Taipei, Taiwan", "Bali, Indonesia") {
		t.Error("a Taiwan result is not in Indonesia")
	}
	if withCountryOf("Bali", "Badung, Bali, Indonesia") != "Bali, Indonesia" {
		t.Error("destination should get the place's country")
	}
}

// nearAutocompleteClient answers global searches with a far-away namesake
// and near searches with the place in the destination.
type nearAutocompleteClient struct {
	fakeNearClient
	global []Suggestion
}

func (f *nearAutocompleteClient) Autocomplete(_ context.Context, query, _, _ string) ([]Suggestion, error) {
	f.record("global:" + query)
	return f.global, nil
}

func getAutocomplete(t *testing.T, h *Handler, rawQuery string) []Suggestion {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/locations/autocomplete?"+rawQuery, nil)
	rec := httptest.NewRecorder()
	if err := h.Autocomplete(echo.New().NewContext(req, rec)); err != nil {
		t.Fatalf("Autocomplete: %v", err)
	}
	var body struct {
		Suggestions []Suggestion `json:"suggestions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return body.Suggestions
}

func TestHandlerAutocompleteNearPrefersDestination(t *testing.T) {
	client := &nearAutocompleteClient{
		fakeNearClient: fakeNearClient{
			cities: map[string]*Point{"jakarta, indonesia": {Lat: -6.2, Lng: 106.8, CountryCode: "ID"}},
			near: map[string][]Suggestion{"playground ancol": {
				{Provider: "geoapify", ExternalID: "ancol", Name: "Playground Ancol", CountryCode: "id", NearCity: true},
			}},
		},
		global: []Suggestion{
			{Provider: "geoapify", ExternalID: "boise", Name: "Gordon S. Bowen Playground", Description: "Gordon S. Bowen Playground, Boise, ID 83720, United States", CountryCode: "us"},
			{Provider: "geoapify", ExternalID: "ancol", Name: "Playground Ancol", CountryCode: "id"},
			{Provider: "geoapify", ExternalID: "bandung", Name: "Playground Ancol Bandung", CountryCode: "id"},
		},
	}
	got := getAutocomplete(t, NewHandler(client), "query=playground+ancol&near=Jakarta,+Indonesia")
	ids := make([]string, len(got))
	for i, s := range got {
		ids[i] = s.ExternalID
	}
	if strings.Join(ids, ",") != "ancol,bandung" {
		t.Fatalf("suggestions = %v, want nearby first, no duplicate, no other country", ids)
	}
}

func TestHandlerAutocompleteNearUnknownDestinationKeepsGlobal(t *testing.T) {
	client := &nearAutocompleteClient{
		global: []Suggestion{{Provider: "geoapify", ExternalID: "x", Name: "Somewhere", CountryCode: "us"}},
	}
	got := getAutocomplete(t, NewHandler(client), "query=somewhere&near=Atlantis")
	if len(got) != 1 || got[0].ExternalID != "x" {
		t.Fatalf("suggestions = %#v", got)
	}
	want := map[string]bool{"global:somewhere, Atlantis": true, "global:somewhere": true}
	for _, q := range client.queries {
		delete(want, q)
	}
	if len(want) != 0 {
		t.Fatalf("queries = %v, missing %v", client.queries, want)
	}
}

func TestHandlerAutocompleteNearDropsOtherCountriesWithoutNearbyMatch(t *testing.T) {
	// Nothing called "playground ancol" around Jakarta: the far-away
	// namesakes must still not be offered.
	client := &nearAutocompleteClient{
		fakeNearClient: fakeNearClient{
			cities: map[string]*Point{"jakarta, indonesia": {Lat: -6.2, Lng: 106.8, CountryCode: "ID"}},
		},
		global: []Suggestion{
			{Provider: "geoapify", ExternalID: "boise", CountryCode: "US"},
			{Provider: "geoapify", ExternalID: "karachi", CountryCode: "PK"},
		},
	}
	if got := getAutocomplete(t, NewHandler(client), "query=playground+ancol&near=Jakarta,+Indonesia"); len(got) != 0 {
		t.Fatalf("suggestions = %#v, want none outside Indonesia", got)
	}
}

// countryClient records SearchCountry calls.
type countryClient struct {
	nearAutocompleteClient
	country string
}

func (f *countryClient) SearchCountry(_ context.Context, query, _, countryCode string, _ Point) ([]Suggestion, error) {
	f.country = countryCode
	return []Suggestion{{Provider: "geoapify", ExternalID: "majalengka", CountryCode: countryCode}}, nil
}

func TestHandlerAutocompleteNearSearchesDestinationCountry(t *testing.T) {
	client := &countryClient{nearAutocompleteClient: nearAutocompleteClient{
		fakeNearClient: fakeNearClient{
			cities: map[string]*Point{"jakarta, indonesia": {Lat: -6.2, Lng: 106.8, CountryCode: "ID"}},
		},
	}}
	got := getAutocomplete(t, NewHandler(client), "query=nanda+house&near=Jakarta,+Indonesia")
	if client.country != "ID" || len(got) != 1 || got[0].ExternalID != "majalengka" {
		t.Fatalf("country = %q, suggestions = %#v", client.country, got)
	}
}

func TestHandlerAutocompleteNearRanksFullMatchesFirst(t *testing.T) {
	near := make([]Suggestion, 0, 8)
	for i := 0; i < 8; i++ {
		near = append(near, Suggestion{Provider: "geoapify", ExternalID: fmt.Sprint("tangerang-", i), Name: "Alun-alun Tangerang", CountryCode: "ID"})
	}
	client := &nearAutocompleteClient{
		fakeNearClient: fakeNearClient{
			cities: map[string]*Point{"jakarta, indonesia": {Lat: -6.2, Lng: 106.8, CountryCode: "ID"}},
			near:   map[string][]Suggestion{"alun-alun majalengka": near},
		},
		global: []Suggestion{{Provider: "geoapify", ExternalID: "majalengka", Name: "Alun-alun Majalengka", CountryCode: "ID"}},
	}
	got := getAutocomplete(t, NewHandler(client), "query=alun-alun+majalengka&near=Jakarta,+Indonesia")
	if len(got) != maxAutocompleteResults || got[0].ExternalID != "majalengka" || got[1].ExternalID != "tangerang-0" {
		t.Fatalf("suggestions = %#v", got)
	}
}

func TestHandlerAutocompleteNearOffersOtherCountriesOnFullMatch(t *testing.T) {
	// A Japan trip; the user looks up a palace in Seoul.
	client := &countryClient{nearAutocompleteClient: nearAutocompleteClient{
		fakeNearClient: fakeNearClient{
			cities: map[string]*Point{"tokyo, japan": {Lat: 35.68, Lng: 139.76, CountryCode: "JP"}},
		},
		global: []Suggestion{
			{Provider: "geoapify", ExternalID: "seoul", Name: "Gyeongbokgung Palace", Description: "Gyeongbokgung Palace, Seoul, South Korea", CountryCode: "KR"},
			{Provider: "geoapify", ExternalID: "busan", Name: "Palace Busan", Description: "Palace Busan, Busan, South Korea", CountryCode: "KR"},
		},
	}}
	got := getAutocomplete(t, NewHandler(client), "query=gyeongbokgung+palace&near=Tokyo,+Japan")
	ids := make([]string, len(got))
	for i, s := range got {
		ids[i] = s.ExternalID
	}
	// countryClient's SearchCountry answers "majalengka" (an in-country place).
	if strings.Join(ids, ",") != "majalengka,seoul" {
		t.Fatalf("suggestions = %v, want the in-country result first, then only the full match abroad", ids)
	}
}
