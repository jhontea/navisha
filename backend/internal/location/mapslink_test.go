package location

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseMapsLink(t *testing.T) {
	cases := []struct {
		name      string
		raw       string
		wantName  string
		wantQuery string
		wantLat   float64
		wantLng   float64
		wantErr   bool
	}{
		{
			name:     "canonical place path with coords",
			raw:      "https://www.google.com/maps/place/Cafe+Batavia/@-6.1291,106.6535,17z",
			wantName: "Cafe Batavia",
			wantLat:  -6.1291,
			wantLng:  106.6535,
		},
		{
			name:     "place path without coords",
			raw:      "https://www.google.com/maps/place/Cafe+Batavia",
			wantName: "Cafe Batavia",
		},
		{
			name:     "q param with coords",
			raw:      "https://maps.google.com/?q=-6.1291,106.6535",
			wantLat:  -6.1291,
			wantLng:  106.6535,
			wantName: "",
		},
		{
			name:      "q param with name",
			raw:       "https://maps.google.com/?q=Cafe+Batavia",
			wantQuery: "Cafe Batavia",
		},
		{
			name:      "search api query",
			raw:       "https://www.google.com/maps/search/?api=1&query=Cafe+Batavia",
			wantQuery: "Cafe Batavia",
		},
		{
			name:    "at coords only",
			raw:     "https://www.google.com/maps/@-6.2,106.8,15z",
			wantLat: -6.2,
			wantLng: 106.8,
		},
		{
			name: "real share link prefers pin over viewport",
			// !3d/!4d is the actual place pin; @lat,lng is the camera center
			// ~250m away. The pin must win.
			raw:      "https://www.google.com/maps/place/Cafe+de+RURU/@-6.9138861,107.6247509,17z/data=!3m1!4b1!4m6!3m5!1s0x2e68e7e1fe7471c7:0xa6a69b11049ee91f!8m2!3d-6.9138914!4d107.6273258!16s%2Fg%2F11xt2d89m_?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D",
			wantName: "Cafe de RURU",
			wantLat:  -6.9138914,
			wantLng:  107.6273258,
		},
		{
			name:    "non-google host rejected",
			raw:     "https://example.com/maps/place/Foo",
			wantErr: true,
		},
		{
			name:    "empty rejected",
			raw:     "   ",
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			link, err := parseMapsLink(tc.raw)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %+v", link)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if link.PlaceName != tc.wantName {
				t.Errorf("PlaceName = %q, want %q", link.PlaceName, tc.wantName)
			}
			if link.Query != tc.wantQuery {
				t.Errorf("Query = %q, want %q", link.Query, tc.wantQuery)
			}
			if link.Lat != tc.wantLat || link.Lng != tc.wantLng {
				t.Errorf("coords = (%v, %v), want (%v, %v)", link.Lat, link.Lng, tc.wantLat, tc.wantLng)
			}
		})
	}
}

func TestResolveMapsLinkCoordinateOnly(t *testing.T) {
	// Geoapify client without a key → reverse geocode is skipped gracefully.
	client := NewGeoapifyClient("", "", 0)
	suggestion, err := ResolveMapsLink(context.Background(), http.DefaultClient, client,
		"https://www.google.com/maps/place/Cafe+Batavia/@-6.1291,106.6535,17z")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if suggestion.Name != "Cafe Batavia" {
		t.Errorf("Name = %q, want %q", suggestion.Name, "Cafe Batavia")
	}
	if suggestion.Provider != mapsLinkProvider {
		t.Errorf("Provider = %q", suggestion.Provider)
	}
	if suggestion.Description == "" {
		t.Error("Description should fall back to formatted coordinates")
	}
	if suggestion.Latitude != -6.1291 || suggestion.Longitude != 106.6535 {
		t.Errorf("coords = (%v, %v)", suggestion.Latitude, suggestion.Longitude)
	}
}

func TestResolveMapsLinkUnsupported(t *testing.T) {
	client := NewGeoapifyClient("", "", 0)
	if _, err := ResolveMapsLink(context.Background(), http.DefaultClient, client, "https://example.com/foo"); !errors.Is(err, ErrUnsupportedLink) {
		t.Fatalf("want ErrUnsupportedLink, got %v", err)
	}
}

func TestFollowRedirectStopsAtNonGoogleHost(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "https://evil.example.com/steal")
		w.WriteHeader(http.StatusFound)
	}))
	defer server.Close()

	// The test server host is not google-owned, so the first hop is refused.
	if _, err := followRedirect(context.Background(), server.Client(), server.URL); !errors.Is(err, ErrUnsupportedLink) {
		t.Fatalf("want ErrUnsupportedLink for non-google hop, got %v", err)
	}
}

func TestReverseGeocodeNotConfigured(t *testing.T) {
	client := NewGeoapifyClient("", "", 0)
	if _, _, ok := client.ReverseGeocode(context.Background(), -6.1, 106.6); ok {
		t.Fatal("expected ok=false when api key missing")
	}
}

func TestFormatCoords(t *testing.T) {
	got := formatCoords(-6.1291, 106.6535)
	if !strings.Contains(got, "-6.129100") || !strings.Contains(got, "106.653500") {
		t.Errorf("formatCoords = %q", got)
	}
}
