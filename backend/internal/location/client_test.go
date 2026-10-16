package location

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGeoapifyClientAutocomplete(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("apiKey"); got != "test-key" {
			t.Fatalf("apiKey = %q", got)
		}
		if got := r.URL.Path; got != "/search" {
			t.Fatalf("path = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[{"place_id":"city-1","name":"Jakarta","formatted":"Jakarta, Indonesia","country_code":"id","lat":-6.2,"lon":106.8}]}`))
	}))
	defer server.Close()

	client := NewGeoapifyClient("test-key", server.URL+"/autocomplete", time.Second)
	items, err := client.Autocomplete(context.Background(), "Jakarta", "region", "en")
	if err != nil {
		t.Fatalf("Autocomplete() error = %v", err)
	}
	if len(items) != 1 || items[0].ExternalID != "city-1" || items[0].CountryCode != "ID" {
		t.Fatalf("Autocomplete() items = %#v", items)
	}
}

func TestGeoapifyClientRequiresAPIKey(t *testing.T) {
	client := NewGeoapifyClient("", "", time.Second)
	_, err := client.Autocomplete(context.Background(), "Jakarta", "region", "en")
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("Autocomplete() error = %v, want ErrNotConfigured", err)
	}
}

func TestGeoapifyClientReverseGeocodeUsesReverseEndpoint(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/geocode/reverse" {
			http.NotFound(w, r)
			return
		}
		if r.URL.Query().Get("lat") != "-6.117791" || r.URL.Query().Get("lon") != "106.858039" {
			t.Errorf("query = %s", r.URL.RawQuery)
		}
		_, _ = w.Write([]byte(`{"results":[{"formatted":"Jalan Lodan Timur, Ancol, North Jakarta, Indonesia","country_code":"id"}]}`))
	}))
	defer server.Close()

	client := NewGeoapifyClient("test-key", server.URL+"/v1/geocode/autocomplete", time.Second)
	address, country, ok := client.ReverseGeocode(context.Background(), -6.117791, 106.858039)
	if !ok || address != "Jalan Lodan Timur, Ancol, North Jakarta, Indonesia" || country != "ID" {
		t.Fatalf("ReverseGeocode() = %q, %q, %v", address, country, ok)
	}
}
