package location

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGeoapifyClientSearchCategory(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if r.URL.Path != "/v2/places" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		if q.Get("categories") != "accommodation.hotel,accommodation.guest_house" ||
			q.Get("filter") != "circle:106.845500,-6.121400,3000" ||
			q.Get("limit") != "8" || q.Get("apiKey") != "test-key" || q.Get("lang") != "id" {
			t.Fatalf("query = %v", q)
		}
		_, _ = w.Write([]byte(`{"type":"FeatureCollection","features":[
			{"properties":{"place_id":"p1","name":"Mercure Hotel Ancol","formatted":"Mercure Hotel Ancol, Pademangan","street":"Jalan Pantai Indah","lat":-6.12,"lon":106.83,"distance":318.4,"categories":["accommodation","accommodation.hotel"]}},
			{"properties":{"place_id":"p2","formatted":"Jalan GOR, Pademangan","street":"Jalan GOR","lat":-6.13,"lon":106.84,"distance":1277.6}},
			{"properties":{"place_id":"","name":"No id","formatted":"x"}}
		]}`))
	}))
	defer server.Close()

	client := NewGeoapifyClient("test-key", server.URL+"/v1/geocode/autocomplete", time.Second)
	got, err := client.SearchCategory(context.Background(), []string{"accommodation.hotel", "accommodation.guest_house"},
		Point{Lat: -6.1214, Lng: 106.8455}, 3000, 8, "id")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("got %+v", got)
	}
	if got[0].Name != "Mercure Hotel Ancol" || got[0].DistanceMeters != 318 || got[0].ExternalID != "p1" || got[0].Lng != 106.83 {
		t.Errorf("first = %+v", got[0])
	}
	if got[1].Name != "" || got[1].Street != "Jalan GOR" || got[1].DistanceMeters != 1278 {
		t.Errorf("unnamed = %+v", got[1])
	}
}

func TestGeoapifyClientSearchCategoryErrors(t *testing.T) {
	if _, err := NewGeoapifyClient("", "", time.Second).SearchCategory(context.Background(), []string{"x"}, Point{}, 1, 1, ""); !errors.Is(err, ErrNotConfigured) {
		t.Errorf("err = %v, want ErrNotConfigured", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()
	client := NewGeoapifyClient("k", server.URL+"/v1/geocode/autocomplete", time.Second)
	if _, err := client.SearchCategory(context.Background(), []string{"x"}, Point{}, 1, 1, ""); err == nil {
		t.Error("want an error for a provider failure")
	}
}
