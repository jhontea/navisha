package location

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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
	queries []string
}

func (f *fakeNearClient) SearchNear(_ context.Context, query, _ string, _ Point, _ int) ([]Suggestion, error) {
	f.queries = append(f.queries, query)
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
