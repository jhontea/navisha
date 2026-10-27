package integration

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/location"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/redis/go-redis/v9"
)

// fakeRouter answers every route with 10 min / 1000 m, or err.
type fakeRouter struct {
	calls atomic.Int32
	err   error
}

func (r *fakeRouter) Route(context.Context, location.Point, location.Point, string) (float64, float64, error) {
	r.calls.Add(1)
	return 600, 1000, r.err
}

var (
	monas   = location.Point{Lat: -6.1754, Lng: 106.8272}
	nearby  = location.Point{Lat: -6.1800, Lng: 106.8272} // ~0.5 km from monas
	blokM   = location.Point{Lat: -6.2440, Lng: 106.8000} // ~8 km from monas
	day1    = time.Date(2026, 11, 2, 0, 0, 0, 0, time.UTC)
	tripDay = []trip.Day{{ID: "d1", Date: day1}}
)

func place(id string, p location.Point, start, end string) activity.Activity {
	return activity.Activity{ID: id, Type: activity.TypeLocation, StartTime: start, EndTime: end,
		Payload: []byte(fmt.Sprintf(`{"location_name":"x","lat":%v,"lng":%v}`, p.Lat, p.Lng))}
}

func legsOf(t *testing.T, h *TripTravelHandler, acts []activity.Activity, stays []accommodation.Accommodation, trans []transportation.Transportation) []TravelLeg {
	t.Helper()
	days := h.travelDays(context.Background(), tripDay, map[string][]activity.Activity{"d1": acts}, stays, trans)
	if len(days) != 1 || days[0].DayID != "d1" || days[0].Date != "2026-11-02" {
		t.Fatalf("days = %+v", days)
	}
	return days[0].Legs
}

func pair(l TravelLeg) string { return l.From.ID + l.From.Event + ">" + l.To.ID + l.To.Event }

func TestTravelPicksPlacesAndBreaksAtTransport(t *testing.T) {
	h := NewTripTravelHandler(nil, nil, nil, nil, &fakeRouter{}, nil)
	review := place("review", blokM, "", "")
	review.Payload = []byte(`{"lat":-6.2,"lng":106.8,"location_verification":"needs_review"}`)
	acts := []activity.Activity{
		place("a", monas, "08:00", "09:00"),
		place("b", nearby, "09:30", ""),
		review,                                  // needs review: no leg either side
		place("zero", location.Point{}, "", ""), // 0,0 = not located
		place("c", monas, "10:00", ""),
		place("d", blokM, "11:00", ""),
		{ID: "note", Type: activity.TypeNote, StartTime: "12:00"},
		place("e", monas, "13:00", ""),
		place("f", blokM, "20:00", ""), // transport at 15:00 sits between e and f
	}
	dep := day1.Add(15 * time.Hour)
	trans := []transportation.Transportation{{ID: "bus", DepartureDatetime: &dep}}
	// Stay checked out today (no time set: guessed before the 15:00 bus, so
	// 12:00 → before "e" at 13:00) and checked in today at a set 21:00.
	lat, lng := blokM.Lat, blokM.Lng
	stays := []accommodation.Accommodation{
		{ID: "old", Lat: &monas.Lat, Lng: &monas.Lng, CheckIn: day1.AddDate(0, 0, -2), CheckOut: day1},
		{ID: "new", Lat: &lat, Lng: &lng, CheckIn: day1, CheckOut: day1.AddDate(0, 0, 2), CheckInTime: "21:00"},
	}

	got := []string{}
	for _, l := range legsOf(t, h, acts, stays, trans) {
		got = append(got, pair(l))
	}
	// Timeline: a b review zero c d old(12:00) note e bus f new(21:00).
	// The note and the bus break the chain; f→new is the same point (skipped).
	want := []string{"a>b", "c>d", "d>oldcheck_out"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("legs = %v, want %v", got, want)
	}
}

func TestTravelModeFactorAndGap(t *testing.T) {
	r := &fakeRouter{}
	h := NewTripTravelHandler(nil, nil, nil, nil, r, nil)
	legs := legsOf(t, h, []activity.Activity{
		place("a", monas, "08:00", "09:00"),
		place("b", nearby, "09:30", "10:00"), // walk 10 min, 30 min gap
		place("c", blokM, "10:10", ""),       // drive 10 × 1.5 = 15 min, 10 min gap: tight
		place("d", monas, "", ""),            // no time: no gap
		place("e", blokM, "23:00", "23:30"),
		place("f", monas, "00:30", ""), // past midnight: no gap
	}, nil, nil)
	if len(legs) != 5 {
		t.Fatalf("legs = %+v", legs)
	}
	check := func(l TravelLeg, mode string, minutes int, gap *int, tight bool) {
		t.Helper()
		if l.Mode != mode || l.Minutes != minutes || l.Source != "route" || l.DistanceM != 1000 {
			t.Errorf("%s: %+v", pair(l), l)
		}
		if (gap == nil) != (l.GapMinutes == nil) || (gap != nil && (*gap != *l.GapMinutes || *l.Tight != tight)) {
			t.Errorf("%s gap: %v tight %v", pair(l), l.GapMinutes, l.Tight)
		}
	}
	thirty, ten := 30, 10
	check(legs[0], "walk", 10, &thirty, false)
	check(legs[1], "drive", 15, &ten, true)
	check(legs[2], "drive", 15, nil, false)
	check(legs[4], "drive", 15, nil, false)
}

func TestTravelEstimatesWhenRouterFails(t *testing.T) {
	for _, err := range []error{errors.New("status 502"), location.ErrNotConfigured} {
		h := NewTripTravelHandler(nil, nil, nil, nil, &fakeRouter{err: err}, nil)
		legs := legsOf(t, h, []activity.Activity{place("a", monas, "", ""), place("b", nearby, "", ""), place("c", blokM, "", "")}, nil, nil)
		// a→b: 0.51 km × 1.25 at 4.5 km/h = 8.5 → 9 min; b→c: ~7.3 km × 1.25 at 25 km/h ≈ 22 min.
		if len(legs) != 2 || legs[0].Source != "estimate" || legs[0].Minutes != 9 || legs[0].Mode != "walk" ||
			legs[1].Mode != "drive" || legs[1].Minutes < 20 || legs[1].Minutes > 26 {
			t.Fatalf("err %v: legs = %+v", err, legs)
		}
	}
}

func TestTravelCapsRouteCallsAndCaches(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	r := &fakeRouter{}
	h := NewTripTravelHandler(nil, nil, nil, nil, r, rdb)

	// 40 legs between distinct points 2 km apart.
	var acts []activity.Activity
	for i := range 41 {
		acts = append(acts, place(fmt.Sprint("a", i), location.Point{Lat: -6 - float64(i)*0.018, Lng: 106.8}, "", ""))
	}
	legs := legsOf(t, h, acts, nil, nil)
	routed := 0
	for _, l := range legs {
		if l.Source == "route" {
			routed++
		}
	}
	if len(legs) != 40 || routed != maxRouteCalls || r.calls.Load() != maxRouteCalls {
		t.Fatalf("legs %d routed %d calls %d", len(legs), routed, r.calls.Load())
	}

	// Again: the 30 cached legs come from Redis, the other 10 are routed now.
	legs = legsOf(t, h, acts, nil, nil)
	for _, l := range legs {
		if l.Source != "route" {
			t.Fatalf("second pass leg %s: %s", pair(l), l.Source)
		}
	}
	if r.calls.Load() != 40 {
		t.Fatalf("calls after second pass = %d, want 40", r.calls.Load())
	}

	// Redis down: still answers (estimates past the cap, no 500).
	mr.Close()
	if legs := legsOf(t, h, acts[:3], nil, nil); len(legs) != 2 {
		t.Fatalf("legs without redis = %+v", legs)
	}
}

func TestTravelSkipsTooFar(t *testing.T) {
	h := NewTripTravelHandler(nil, nil, nil, nil, &fakeRouter{}, nil)
	legs := legsOf(t, h, []activity.Activity{place("jkt", monas, "", ""), place("sby", location.Point{Lat: -7.2575, Lng: 112.7521}, "", "")}, nil, nil)
	if len(legs) != 0 {
		t.Fatalf("legs = %+v", legs)
	}
}

func TestStayTimesFollowsFirstJourney(t *testing.T) {
	at := func(h, m int) *time.Time {
		v := day1.Add(time.Duration(h)*time.Hour + time.Duration(m)*time.Minute)
		return &v
	}
	// 10:00 flight landing 15:55 + 17:30 bus = one journey; 22:00 flight is separate.
	in, out := stayTimes([]transportation.Transportation{
		{DepartureDatetime: at(22, 0)},
		{DepartureDatetime: at(10, 0), ArrivalDatetime: at(15, 55)},
		{DepartureDatetime: at(17, 30), ArrivalDatetime: at(18, 0)},
	}, "2026-11-02")
	if in != "18:01" || out != "09:59" {
		t.Fatalf("stayTimes = %s, %s", in, out)
	}
}

func TestTravelAsksEachRouteOnceAndRemembersNoRoute(t *testing.T) {
	mr := miniredis.RunT(t)
	r := &fakeRouter{err: fmt.Errorf("status 400: %w", location.ErrNoRoute)}
	h := NewTripTravelHandler(nil, nil, nil, nil, r, redis.NewClient(&redis.Options{Addr: mr.Addr()}))
	// monas→blokM twice and blokM→monas once: two distinct routes.
	acts := []activity.Activity{place("a", monas, "", ""), place("b", blokM, "", ""), place("c", monas, "", ""), place("d", blokM, "", "")}
	for pass := 1; pass <= 2; pass++ {
		legs := legsOf(t, h, acts, nil, nil)
		if len(legs) != 3 || legs[0].Source != "estimate" || r.calls.Load() != 2 {
			t.Fatalf("pass %d: legs %+v calls %d", pass, legs, r.calls.Load())
		}
	}
}
