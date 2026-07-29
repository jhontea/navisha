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
