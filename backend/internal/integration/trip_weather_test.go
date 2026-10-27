package integration

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/location"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/jhontea/navisha/backend/internal/weather"
)

type weatherFixture struct {
	acts  map[string][]activity.Activity
	stays []accommodation.Accommodation
	city  *location.Point

	mu        sync.Mutex
	calls     []string // "lat,lng:dates" per Forecast call
	cityCalls int
	failAt    string // Forecast fails for this "lat,lng"
}

func (f *weatherFixture) Get(context.Context, string, string) (*trip.Trip, []trip.Day, error) {
	return nil, nil, errors.New("unused")
}
func (f *weatherFixture) ListByTrip(context.Context, string, string) (map[string][]activity.Activity, error) {
	return f.acts, nil
}
func (f *weatherFixture) List(context.Context, string, string) ([]accommodation.Accommodation, error) {
	return f.stays, nil
}
func (f *weatherFixture) CityCenter(context.Context, string, string) (*location.Point, error) {
	f.cityCalls++
	return f.city, nil
}
func (f *weatherFixture) Forecast(_ context.Context, lat, lng float64, dates []string) ([]weather.Day, error) {
	key := fmt.Sprintf("%.2f,%.2f", lat, lng)
	f.mu.Lock()
	f.calls = append(f.calls, fmt.Sprint(key, ":", dates))
	f.mu.Unlock()
	if key == f.failAt {
		return nil, errors.New("upstream down")
	}
	out := make([]weather.Day, len(dates))
	for i, d := range dates {
		out[i] = weather.Day{Date: d, WeatherCode: int(lat), TempMin: lng, TempMax: lng + 5}
	}
	return out, nil
}

func ptr(v float64) *float64 { return &v }

func placeAct(lat, lng *float64) activity.Activity {
	payload := []byte(`{"location_name":"x"}`)
	if lat != nil && lng != nil {
		payload = []byte(fmt.Sprintf(`{"location_name":"x","lat":%v,"lng":%v}`, *lat, *lng))
	}
	return activity.Activity{Type: activity.TypeLocation, Payload: payload}
}

func newWeatherHandler(f *weatherFixture, today time.Time) *TripWeatherHandler {
	h := NewTripWeatherHandler(f, f, f, f, f)
	h.now = func() time.Time { return today.Add(10 * time.Hour) }
	return h
}

func tripDays(start time.Time, n int) []trip.Day {
	days := make([]trip.Day, n)
	for i := range days {
		days[i] = trip.Day{ID: fmt.Sprint("day-", i+1), Date: start.AddDate(0, 0, i), DayNumber: i + 1}
	}
	return days
}

func TestTripWeather_PicksStayThenPlaceThenPreviousThenDestination(t *testing.T) {
	today := d(2026, 10, 27)
	days := tripDays(today, 5) // 27..31
	f := &weatherFixture{
		stays: []accommodation.Accommodation{
			// two nights (27, 28); unpinned stay on 30 is ignored
			{Lat: ptr(1), Lng: ptr(10), CheckIn: today, CheckOut: today.AddDate(0, 0, 2)},
			{Lat: ptr(0), Lng: ptr(0), CheckIn: today.AddDate(0, 0, 3), CheckOut: today.AddDate(0, 0, 4)},
		},
		acts: map[string][]activity.Activity{
			"day-1": {placeAct(ptr(9), ptr(90))}, // stay wins over the place
			"day-3": {{Type: activity.TypeNote}, placeAct(nil, nil), placeAct(ptr(2), ptr(20)), placeAct(ptr(3), ptr(30))},
		},
		city: &location.Point{Lat: 5, Lng: 50},
	}
	h := newWeatherHandler(f, today)
	out, err := h.forecast(context.Background(), "u", &trip.Trip{ID: "t", Description: "Tokyo"}, days)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]int{"2026-10-27": 1, "2026-10-28": 1, "2026-10-29": 2, "2026-10-30": 2, "2026-10-31": 2}
	if len(out) != len(want) {
		t.Fatalf("days = %+v", out)
	}
	for i, day := range out {
		if want[day.Date] != day.WeatherCode || (i > 0 && out[i-1].Date >= day.Date) {
			t.Fatalf("days = %+v", out)
		}
	}
	if len(f.calls) != 2 || f.cityCalls != 0 {
		t.Fatalf("calls = %v, city calls = %d", f.calls, f.cityCalls)
	}
}

func TestTripWeather_DestinationFallbackOnlyWhenNoPlace(t *testing.T) {
	today := d(2026, 10, 27)
	days := tripDays(today, 3)
	f := &weatherFixture{
		acts: map[string][]activity.Activity{"day-2": {placeAct(ptr(2), ptr(20))}},
		city: &location.Point{Lat: 5, Lng: 50},
	}
	out, err := newWeatherHandler(f, today).forecast(context.Background(), "u", &trip.Trip{Description: "Tokyo"}, days)
	if err != nil {
		t.Fatal(err)
	}
	// day 1: destination, day 2: place, day 3: previous day's place
	if len(out) != 3 || out[0].WeatherCode != 5 || out[1].WeatherCode != 2 || out[2].WeatherCode != 2 || f.cityCalls != 1 {
		t.Fatalf("days = %+v, city calls = %d", out, f.cityCalls)
	}

	// The geocoded destination is reused by later requests.
	if _, err := newWeatherHandler(f, today).forecast(context.Background(), "u", &trip.Trip{Description: "Tokyo"}, days); err != nil || f.cityCalls != 2 {
		t.Fatalf("fresh handler: city calls = %d, err = %v", f.cityCalls, err)
	}
	h := newWeatherHandler(f, today)
	for range 2 {
		_, _ = h.forecast(context.Background(), "u", &trip.Trip{Description: " tokyo"}, days)
	}
	if f.cityCalls != 3 {
		t.Fatalf("cached handler: city calls = %d", f.cityCalls)
	}

	// No destination and no place → no weather and no lookups.
	f = &weatherFixture{}
	out, _ = newWeatherHandler(f, today).forecast(context.Background(), "u", &trip.Trip{Description: " "}, days)
	if len(out) != 0 || len(f.calls) != 0 || f.cityCalls != 0 {
		t.Fatalf("days = %+v, calls = %v, city calls = %d", out, f.calls, f.cityCalls)
	}
}

func TestTripWeather_OnlyDaysInForecastRange(t *testing.T) {
	today := d(2026, 10, 27)
	f := &weatherFixture{city: &location.Point{Lat: 5, Lng: 50}}
	h := newWeatherHandler(f, today)
	tr := &trip.Trip{Description: "Tokyo"}

	// Trip from yesterday for 18 days: today..today+15 kept (16 days).
	out, _ := h.forecast(context.Background(), "u", tr, tripDays(today.AddDate(0, 0, -1), 18))
	if len(out) != 16 || out[0].Date != "2026-10-27" || out[15].Date != "2026-11-11" {
		t.Fatalf("days = %d %+v", len(out), out)
	}

	// Past and far-future trips: empty, no upstream or geocoder calls.
	f.calls, f.cityCalls = nil, 0
	for _, start := range []time.Time{today.AddDate(0, 0, -5), today.AddDate(0, 0, 16)} {
		out, err := h.forecast(context.Background(), "u", tr, tripDays(start, 3))
		if err != nil || out == nil || len(out) != 0 {
			t.Fatalf("start %s: days = %+v, err = %v", start, out, err)
		}
	}
	if len(f.calls) != 0 || f.cityCalls != 0 {
		t.Fatalf("calls = %v, city calls = %d", f.calls, f.cityCalls)
	}
}

func TestTripWeather_UpstreamErrorSkipsThatPlaceOnly(t *testing.T) {
	today := d(2026, 10, 27)
	f := &weatherFixture{
		acts: map[string][]activity.Activity{
			"day-1": {placeAct(ptr(1), ptr(10))},
			"day-2": {placeAct(ptr(2), ptr(20))},
		},
		failAt: "1.00,10.00",
	}
	out, err := newWeatherHandler(f, today).forecast(context.Background(), "u", &trip.Trip{}, tripDays(today, 2))
	if err != nil || len(out) != 1 || out[0].Date != "2026-10-28" {
		t.Fatalf("days = %+v, err = %v", out, err)
	}
}
