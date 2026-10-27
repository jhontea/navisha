package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/location"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/transportation"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

const (
	walkMaxKm = 1.5  // straight-line distance up to which a leg is walked
	minLegKm  = 0.05 // closer than this is the same place: no leg
	maxLegKm  = 300  // farther than this is not a day-to-day trip: no leg
	// driveTrafficFactor stretches Geoapify's traffic-free drive time to a
	// busy city's.
	driveTrafficFactor = 1.5
	// Estimates: straight line × roadFactor at a door-to-door speed (the
	// drive speed already includes city traffic).
	roadFactor = 1.25
	walkKmh    = 4.5
	driveKmh   = 25
	// maxRouteCalls caps routing calls per request; the rest are estimated.
	maxRouteCalls    = 30
	routeConcurrency = 4
	routeTimeout     = 10 * time.Second
	travelCacheTTL   = 7 * 24 * time.Hour

	// Stay times the timeline guesses when none is set (frontend timeline.ts).
	defaultCheckIn    = "14:00"
	defaultCheckOut   = "12:00"
	connectionMinutes = 180
)

type (
	travelTransports interface {
		List(ctx context.Context, userID, tripID string) ([]transportation.Transportation, error)
	}
	router interface {
		Route(ctx context.Context, from, to location.Point, mode string) (seconds, meters float64, err error)
	}
)

// TravelRef names a timeline entry the way the frontend's TimelineEntry does.
type TravelRef struct {
	Kind  string `json:"kind"` // "activity" or "accommodation"
	ID    string `json:"id"`
	Event string `json:"event,omitempty"` // "check_in" or "check_out" for a stay
}

// TravelLeg is the trip between two neighbouring timeline entries.
type TravelLeg struct {
	From       TravelRef `json:"from"`
	To         TravelRef `json:"to"`
	Mode       string    `json:"mode"` // "walk" or "drive"
	Minutes    int       `json:"minutes"`
	DistanceM  int       `json:"distance_m"`
	Source     string    `json:"source"` // "route" (Geoapify) or "estimate" (straight line)
	GapMinutes *int      `json:"gap_minutes,omitempty"`
	Tight      *bool     `json:"tight,omitempty"`
}

type TravelDay struct {
	DayID string      `json:"day_id"`
	Date  string      `json:"date"`
	Legs  []TravelLeg `json:"legs"`
}

// TripTravelHandler serves the travel time between neighbouring places on
// each day's timeline.
type TripTravelHandler struct {
	trips      weatherTrips
	activities weatherActivities
	stays      weatherStays
	transports travelTransports
	router     router
	rdb        *redis.Client
	group      singleflight.Group
}

func NewTripTravelHandler(trips weatherTrips, activities weatherActivities, stays weatherStays, transports travelTransports, r router, rdb *redis.Client) *TripTravelHandler {
	return &TripTravelHandler{trips: trips, activities: activities, stays: stays, transports: transports, router: r, rdb: rdb}
}

func (h *TripTravelHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/travel-times", middleware.WithUser(h.Get), authMiddleware)
}

func (h *TripTravelHandler) Get(c echo.Context, userID string) error {
	ctx := c.Request().Context()
	t, days, err := h.trips.Get(ctx, userID, c.Param("trip_id"))
	if err != nil {
		return mapTripOverviewError(err)
	}
	acts, err := h.activities.ListByTrip(ctx, userID, t.ID)
	if err != nil {
		return mapTripOverviewError(fmt.Errorf("trip travel: activities: %w", err))
	}
	stays, err := h.stays.List(ctx, userID, t.ID)
	if err != nil {
		return mapTripOverviewError(fmt.Errorf("trip travel: stays: %w", err))
	}
	trans, err := h.transports.List(ctx, userID, t.ID)
	if err != nil {
		return mapTripOverviewError(fmt.Errorf("trip travel: transports: %w", err))
	}
	return c.JSON(http.StatusOK, map[string]any{"days": h.travelDays(ctx, days, acts, stays, trans)})
}

// travelDays builds each day's legs (days in date order) and times them.
func (h *TripTravelHandler) travelDays(ctx context.Context, days []trip.Day, acts map[string][]activity.Activity, stays []accommodation.Accommodation, trans []transportation.Transportation) []TravelDay {
	sorted := append([]trip.Day(nil), days...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Date.Before(sorted[j].Date) })
	out := make([]TravelDay, len(sorted))
	var pending []*pendingLeg
	for i, d := range sorted {
		date := d.Date.UTC().Format("2006-01-02")
		out[i] = TravelDay{DayID: d.ID, Date: date, Legs: []TravelLeg{}}
		stops := dayTimeline(date, acts[d.ID], stays, trans)
		for j := 0; j+1 < len(stops); j++ {
			if l := newLeg(stops[j], stops[j+1]); l != nil {
				l.day = i
				pending = append(pending, l)
			}
		}
	}
	h.time(ctx, pending)
	for _, l := range pending {
		out[l.day].Legs = append(out[l.day].Legs, l.TravelLeg)
	}
	return out
}

// stop is one entry of a day's timeline.
type stop struct {
	ref        TravelRef
	point      *location.Point // nil: not a place (transport, note, unpinned)
	start, end string          // "HH:MM", "" when not set
	at         string          // sort key of a transport or stay
}

// dayTimeline orders a day's entries exactly as the frontend's
// buildStaticItems + interleaveTimeline (features/activity/lib/timeline.ts)
// do, so each leg sits between the two cards it connects.
func dayTimeline(date string, acts []activity.Activity, stays []accommodation.Accommodation, trans []transportation.Transportation) []stop {
	var static []stop
	var today []transportation.Transportation
	for _, t := range trans {
		if t.DepartureDatetime != nil && t.DepartureDatetime.UTC().Format("2006-01-02") == date {
			today = append(today, t)
			static = append(static, stop{ref: TravelRef{Kind: "transport", ID: t.ID}, at: hhmm(*t.DepartureDatetime)})
		}
	}
	checkIn, checkOut := stayTimes(today, date)
	for _, s := range stays {
		var p *location.Point
		if pinned(s.Lat, s.Lng) {
			p = &location.Point{Lat: *s.Lat, Lng: *s.Lng}
		}
		// Only a time the traveller set counts for the gap; the guess only sorts.
		if s.CheckIn.UTC().Format("2006-01-02") == date {
			t := clock(s.CheckInTime)
			static = append(static, stop{ref: TravelRef{Kind: "accommodation", ID: s.ID, Event: "check_in"}, point: p, start: t, end: t, at: or(t, checkIn)})
		}
		if s.CheckOut.UTC().Format("2006-01-02") == date {
			t := clock(s.CheckOutTime)
			static = append(static, stop{ref: TravelRef{Kind: "accommodation", ID: s.ID, Event: "check_out"}, point: p, start: t, end: t, at: or(t, checkOut)})
		}
	}
	sort.SliceStable(static, func(i, j int) bool { return static[i].at < static[j].at })

	out := make([]stop, 0, len(acts)+len(static))
	for _, a := range acts {
		s := stop{ref: TravelRef{Kind: "activity", ID: a.ID}, start: clock(a.StartTime), end: clock(a.EndTime)}
		if s.start != "" {
			for len(static) > 0 && static[0].at <= s.start {
				out, static = append(out, static[0]), static[1:]
			}
		}
		if a.Type == activity.TypeLocation {
			var pl activity.LocationPayload
			if json.Unmarshal(a.Payload, &pl) == nil && pinned(pl.Lat, pl.Lng) && pl.LocationVerification != "needs_review" {
				s.point = &location.Point{Lat: *pl.Lat, Lng: *pl.Lng}
			}
		}
		out = append(out, s)
	}
	return append(out, static...)
}

// stayTimes ports timeline.ts stayTimes: check-out before the day's first
// transport, check-in after the day's first journey (legs within
// connectionMinutes of each other).
func stayTimes(today []transportation.Transportation, date string) (checkIn, checkOut string) {
	type span struct{ start, end string }
	var legs []span
	for _, t := range today {
		start, end := hhmm(*t.DepartureDatetime), hhmm(*t.DepartureDatetime)
		if t.ArrivalDatetime != nil && t.ArrivalDatetime.UTC().Format("2006-01-02") == date {
			end = hhmm(*t.ArrivalDatetime)
		}
		legs = append(legs, span{start, end})
	}
	sort.SliceStable(legs, func(i, j int) bool { return legs[i].start < legs[j].start })
	checkIn, checkOut = defaultCheckIn, defaultCheckOut
	if len(legs) == 0 {
		return checkIn, checkOut
	}
	if legs[0].start <= defaultCheckOut {
		checkOut = shiftClock(legs[0].start, -1)
	}
	journeyEnd := legs[0].end
	for _, l := range legs[1:] {
		gap := minutesOf(l.start) - minutesOf(journeyEnd)
		if gap < 0 || gap > connectionMinutes {
			break
		}
		if l.end > journeyEnd {
			journeyEnd = l.end
		}
	}
	if journeyEnd >= defaultCheckIn {
		checkIn = shiftClock(journeyEnd, 1)
	}
	return checkIn, checkOut
}

type pendingLeg struct {
	TravelLeg
	day      int
	from, to location.Point
	km       float64 // straight line
}

// newLeg returns the leg between two neighbouring entries that are both
// places at a day-to-day distance, untimed; nil otherwise.
func newLeg(a, b stop) *pendingLeg {
	if a.point == nil || b.point == nil {
		return nil
	}
	km := location.DistanceKm(*a.point, *b.point)
	if km < minLegKm || km > maxLegKm {
		return nil
	}
	l := &pendingLeg{TravelLeg: TravelLeg{From: a.ref, To: b.ref, Mode: "drive"}, from: *a.point, to: *b.point, km: km}
	if km <= walkMaxKm {
		l.Mode = "walk"
	}
	// A leg past midnight (b before a) gets no gap.
	if from, to := or(a.end, a.start), b.start; from != "" && to != "" && minutesOf(to) >= minutesOf(from) {
		gap := minutesOf(to) - minutesOf(from)
		l.GapMinutes = &gap
	}
	return l
}

// routeResult is a cached Geoapify answer; NoRoute remembers that there is
// none (e.g. across the sea) so it is not asked again.
type routeResult struct {
	Seconds float64 `json:"s"`
	Meters  float64 `json:"m"`
	NoRoute bool    `json:"n,omitempty"`
}

// time fills each leg's minutes and distance: from the cache, else Geoapify
// (up to maxRouteCalls distinct routes), else a straight-line estimate.
// Cache errors are logged and skipped (fail-open).
func (h *TripTravelHandler) time(ctx context.Context, legs []*pendingLeg) {
	if len(legs) == 0 {
		return
	}
	// One entry per distinct route: a day that returns to the hotel twice
	// asks once.
	routes := map[string]*routeResult{}
	var keys []string
	byKey := map[string]*pendingLeg{}
	for _, l := range legs {
		k := travelCacheKey(l)
		if _, ok := byKey[k]; !ok {
			byKey[k] = l
			keys = append(keys, k)
		}
	}
	if h.rdb != nil {
		vals, err := h.rdb.MGet(ctx, keys...).Result()
		if err != nil {
			slog.Warn("travel: redis cache read failed", "error", err)
		}
		for i, v := range vals {
			var r routeResult
			if raw, ok := v.(string); ok && json.Unmarshal([]byte(raw), &r) == nil {
				routes[keys[i]] = &r
			}
		}
	}

	// Fetches outlive the request (detached context) so a caller that leaves
	// neither fails others sharing the call nor loses what was fetched.
	fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), routeTimeout)
	defer cancel()
	var toFetch []string
	for _, k := range keys {
		if routes[k] == nil && len(toFetch) < maxRouteCalls {
			toFetch = append(toFetch, k)
		}
	}
	fetched := make([]*routeResult, len(toFetch)) // nil: failed, try again next time
	var wg sync.WaitGroup
	sem := make(chan struct{}, routeConcurrency)
	for i, k := range toFetch {
		l := byKey[k]
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			v, err, _ := h.group.Do(k, func() (any, error) {
				sec, m, err := h.router.Route(fetchCtx, l.from, l.to, l.Mode)
				if errors.Is(err, location.ErrNoRoute) {
					return &routeResult{NoRoute: true}, nil
				}
				return &routeResult{Seconds: sec, Meters: m}, err
			})
			if err != nil {
				if !errors.Is(err, location.ErrNotConfigured) {
					slog.Warn("travel: route failed, estimating", "error", err)
				}
				return
			}
			fetched[i] = v.(*routeResult)
		}()
	}
	wg.Wait()
	if len(toFetch) > 0 {
		slog.Info("travel: upstream routes", "calls", len(toFetch), "cached", len(routes))
	}

	var pipe redis.Pipeliner
	if h.rdb != nil {
		pipe = h.rdb.Pipeline()
	}
	for i, r := range fetched {
		if r == nil {
			continue
		}
		routes[toFetch[i]] = r
		if b, err := json.Marshal(r); err == nil && pipe != nil {
			pipe.Set(fetchCtx, toFetch[i], b, travelCacheTTL)
		}
	}
	if pipe != nil && pipe.Len() > 0 {
		if _, err := pipe.Exec(fetchCtx); err != nil {
			slog.Warn("travel: redis cache write failed", "error", err)
		}
	}

	for _, l := range legs {
		if r := routes[travelCacheKey(l)]; r != nil && !r.NoRoute {
			minutes := r.Seconds / 60
			if l.Mode == "drive" {
				minutes *= driveTrafficFactor
			}
			l.Minutes, l.DistanceM, l.Source = ceilMinutes(minutes), int(math.Round(r.Meters)), "route"
		} else {
			road := l.km * roadFactor
			speed := float64(driveKmh)
			if l.Mode == "walk" {
				speed = walkKmh
			}
			l.Minutes, l.DistanceM, l.Source = ceilMinutes(road/speed*60), int(math.Round(road*1000)), "estimate"
		}
		if l.GapMinutes != nil {
			tight := *l.GapMinutes < l.Minutes
			l.Tight = &tight
		}
	}
}

// travelCacheKey keys a route by mode and direction, at ~11 m precision.
func travelCacheKey(l *pendingLeg) string {
	return fmt.Sprintf("travel:v1:%s:%.4f:%.4f:%.4f:%.4f", l.Mode, l.from.Lat, l.from.Lng, l.to.Lat, l.to.Lng)
}

func ceilMinutes(m float64) int { return max(1, int(math.Ceil(m))) }

// hhmm reads a datetime's wall clock as stored (UTC), like the frontend.
func hhmm(t time.Time) string { return t.UTC().Format("15:04") }

// clock trims "HH:MM[:SS]" to "HH:MM"; "" stays "".
func clock(v string) string {
	if len(v) < 5 {
		return ""
	}
	return v[:5]
}

func minutesOf(hm string) int {
	var h, m int
	_, _ = fmt.Sscanf(hm, "%d:%d", &h, &m)
	return h*60 + m
}

// shiftClock moves "HH:MM" by minutes, clamped to the same day.
func shiftClock(hm string, minutes int) string {
	total := min(23*60+59, max(0, minutesOf(hm)+minutes))
	return fmt.Sprintf("%02d:%02d", total/60, total%60)
}

func or(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
