package location

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
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
		if r.URL.Query().Get("lat") == "-6.735603" {
			// Nearest known place is another one, 340 m away.
			_, _ = w.Write([]byte(`{"results":[{"formatted":"Masjid Al Huriyah, 11, Sutawangi 45454, JR, Indonesia","country_code":"id","distance":339.98}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"results":[{"formatted":"Mason Pine Hotel, Jalan Parahyangan 1, Kota Baru Parahyangan, Cipeundeuy 40714, West Java, Indonesia","country_code":"id","distance":0}]}`))
	}))
	defer server.Close()

	client := NewGeoapifyClient("test-key", server.URL+"/v1/geocode/autocomplete", time.Second)
	address, country, ok := client.ReverseGeocode(context.Background(), -6.863947, 107.480111)
	if !ok || address != "Mason Pine Hotel, Jalan Parahyangan 1, Kota Baru Parahyangan, Cipeundeuy 40714, West Java, Indonesia" || country != "ID" {
		t.Fatalf("ReverseGeocode() = %q, %q, %v", address, country, ok)
	}

	// Too far to be the place: no address (the caller keeps coordinates), country kept.
	address, country, ok = client.ReverseGeocode(context.Background(), -6.735603, 108.263293)
	if !ok || address != "" || country != "ID" {
		t.Fatalf("far ReverseGeocode() = %q, %q, %v", address, country, ok)
	}
}

func TestGeoapifyClientRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if q.Get("waypoints") != "-6.200000,106.800000|-6.210000,106.810000" || q.Get("mode") != "walk" || q.Get("apiKey") != "test-key" {
			t.Errorf("query = %v", q)
		}
		_, _ = w.Write([]byte(`{"results":[{"distance":1520,"time":1210.5}]}`))
	}))
	defer server.Close()

	client := NewGeoapifyClient("test-key", "", time.Second)
	client.routingURL = server.URL + "/v1/routing"
	sec, m, err := client.Route(context.Background(), Point{Lat: -6.2, Lng: 106.8}, Point{Lat: -6.21, Lng: 106.81}, "walk")
	if err != nil || sec != 1210.5 || m != 1520 {
		t.Fatalf("Route() = %v, %v, %v", sec, m, err)
	}
}

func TestGeoapifyClientRouteErrorHidesAPIKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusBadGateway)
	}))
	client := NewGeoapifyClient("secret-key", "", time.Second)
	client.routingURL = server.URL
	if _, _, err := client.Route(context.Background(), Point{}, Point{Lat: 1}, "drive"); err == nil || strings.Contains(err.Error(), "secret-key") {
		t.Fatalf("status error = %v", err)
	}
	server.Close() // connection refused: the transport error carries the URL
	if _, _, err := client.Route(context.Background(), Point{}, Point{Lat: 1}, "drive"); err == nil || strings.Contains(err.Error(), "secret-key") {
		t.Fatalf("transport error = %v", err)
	}
	if _, _, err := NewGeoapifyClient("", "", time.Second).Route(context.Background(), Point{}, Point{}, "walk"); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("no key error = %v", err)
	}
}
