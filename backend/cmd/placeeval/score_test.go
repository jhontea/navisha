package main

import (
	"errors"
	"testing"
)

func TestNameMatches(t *testing.T) {
	cases := []struct {
		query string
		p     place
		want  bool
	}{
		{"Mercure Hotel Ancol", place{Name: "Mercure Jakarta Ancol"}, true},
		{"Nanda House", place{Name: "Shwe Nandaw Guest House"}, false},
		{"Beach City International Stadium", place{Name: "Ancol Beach City Mall"}, false}, // 2 of 4 words: the mall, not the stadium
		{"Kopi Kenangan Senayan", place{Name: "Kopi Kenangan - FX Sudirman"}, true},
		{"Stasiun Cirebon", place{Name: "Cirebon"}, true}, // only generic words to match
		{"Sea World Ancol", place{Name: "Dunia Fantasi", Address: "Ancol"}, false},
		{"Sea World Ancol", place{Name: "SeaWorld Ancol"}, true},
	}
	for _, c := range cases {
		if got := nameMatches(c.query, c.p); got != c.want {
			t.Errorf("nameMatches(%q, %q) = %v, want %v", c.query, c.p.Name, got, c.want)
		}
	}
}

func TestGrade(t *testing.T) {
	q := evalQuery{Query: "Mercure Hotel Ancol", Area: ancol}
	inArea := place{Name: "Mercure Jakarta Ancol", Lat: -6.1240, Lng: 106.8440}
	other := place{Name: "Discovery Hotel", Lat: -6.1240, Lng: 106.8440}
	far := place{Name: "Mercure Hotel Ancol", Lat: -6.7356, Lng: 108.2633}

	cases := []struct {
		name    string
		results []place
		err     error
		want    verdict
	}{
		{"right", []place{inArea}, nil, verdictOK},
		{"other place in area", []place{other}, nil, verdictWrongName},
		{"outside area", []place{far}, nil, verdictWrongArea},
		{"no results", nil, nil, verdictNone},
		{"failed", nil, errors.New("HTTP 403"), verdictError},
	}
	for _, c := range cases {
		if got := grade(q, c.results, c.err); got != c.want {
			t.Errorf("%s: grade = %s, want %s", c.name, got, c.want)
		}
	}

	cat := evalQuery{Query: "hotel dekat Ancol", Area: ancol, Category: []string{"hotel"}}
	if got := grade(cat, []place{other}, nil); got != verdictOK {
		t.Errorf("hotel in area: grade = %s, want ok", got)
	}
	cafe := evalQuery{Query: "kafe di Ancol", Area: ancol, Category: []string{"kafe", "cafe"}}
	if got := grade(cafe, []place{other}, nil); got != verdictWrongName {
		t.Errorf("hotel for a cafe search: grade = %s, want name", got)
	}
}

func TestDistanceKm(t *testing.T) {
	// Ancol to Jatiwangi is roughly 170 km in a straight line.
	if d := distanceKm(ancol.Lat, ancol.Lng, jatiwangi.Lat, jatiwangi.Lng); d < 160 || d > 180 {
		t.Errorf("distanceKm = %.1f, want about 170", d)
	}
}
