package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jhontea/navisha/backend/internal/accommodation"
	"github.com/jhontea/navisha/backend/internal/activity"
	"github.com/jhontea/navisha/backend/internal/location"
	"github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/jhontea/navisha/backend/internal/trip"
	"github.com/jhontea/navisha/backend/internal/weather"
	"github.com/labstack/echo/v4"
)

// forecastDays is Open-Meteo's forecast range: today plus 15 days. It also
// caps the upstream calls per request (at most one per place per day).
const forecastDays = 16

// The parts of the domain usecases the weather handler uses.
type (
	weatherTrips interface {
		Get(ctx context.Context, userID, tripID string) (*trip.Trip, []trip.Day, error)
	}
	weatherActivities interface {
		ListByTrip(ctx context.Context, userID, tripID string) (map[string][]activity.Activity, error)
	}
	weatherStays interface {
		List(ctx context.Context, userID, tripID string) ([]accommodation.Accommodation, error)
	}
	forecaster interface {
		Forecast(ctx context.Context, lat, lng float64, dates []string) ([]weather.Day, error)
	}
	cityLocator interface {
		CityCenter(ctx context.Context, city, language string) (*location.Point, error)
	}
)

// TripWeatherHandler serves the daily forecast for the days of a trip that
// fall in the forecast range, each at the place the traveller is that day.
type TripWeatherHandler struct {
	trips      weatherTrips
	activities weatherActivities
	stays      weatherStays
	weather    forecaster
	cities     cityLocator
	now        func() time.Time
	// destinations caches destination text -> *location.Point (nil when not
	// found) so repeat views don't spend geocoder quota, up to
	// maxCachedDestinations entries.
	destinations      sync.Map
	destinationsCount atomic.Int32
}

const maxCachedDestinations = 2000

func NewTripWeatherHandler(trips weatherTrips, activities weatherActivities, stays weatherStays, w forecaster, cities cityLocator) *TripWeatherHandler {
	return &TripWeatherHandler{trips: trips, activities: activities, stays: stays, weather: w, cities: cities, now: time.Now}
}

func (h *TripWeatherHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/trips/:trip_id/weather", middleware.WithUser(h.Get), authMiddleware)
}

func (h *TripWeatherHandler) Get(c echo.Context, userID string) error {
	ctx := c.Request().Context()
	tripID := c.Param("trip_id")
	t, days, err := h.trips.Get(ctx, userID, tripID)
	if err != nil {
		return mapTripOverviewError(err)
	}
	out, err := h.forecast(ctx, userID, t, days)
	if err != nil {
		return mapTripOverviewError(err)
	}
	return c.JSON(http.StatusOK, map[string]any{"days": out})
}

// forecast returns the forecast of each trip day in range, in date order.
// A place whose forecast cannot be fetched is skipped (logged), not failed.
func (h *TripWeatherHandler) forecast(ctx context.Context, userID string, t *trip.Trip, days []trip.Day) ([]weather.Day, error) {
	out := []weather.Day{}
	today := civilDate(h.now().UTC())
	last := today.AddDate(0, 0, forecastDays-1)
	inRange := false
	for _, d := range days {
		if date := civilDate(d.Date); !date.Before(today) && !date.After(last) {
			inRange = true
			break
		}
	}
	if !inRange {
		return out, nil
	}

	acts, err := h.activities.ListByTrip(ctx, userID, t.ID)
	if err != nil {
		return nil, fmt.Errorf("trip weather: activities: %w", err)
	}
	stays, err := h.stays.List(ctx, userID, t.ID)
	if err != nil {
		return nil, fmt.Errorf("trip weather: stays: %w", err)
	}
	sorted := append([]trip.Day(nil), days...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Date.Before(sorted[j].Date) })
	points := dayPoints(sorted, acts, stays)

	// Group the in-range days by place; the trip's destination stands in for
	// days with no place at all (geocoded once, only when needed).
	type group struct {
		point *location.Point
		dates []string
	}
	var groups []*group
	byKey := map[string]*group{}
	var destination *location.Point
	destinationTried := false
	for i, d := range sorted {
		date := civilDate(d.Date)
		if date.Before(today) || date.After(last) {
			continue
		}
		p := points[i]
		if p == nil {
			if !destinationTried {
				destinationTried = true
				destination = h.destination(ctx, t.Description)
			}
			p = destination
		}
		if p == nil {
			continue
		}
		key := fmt.Sprintf("%.2f,%.2f", weather.Round(p.Lat), weather.Round(p.Lng))
		g := byKey[key]
		if g == nil {
			g = &group{point: p}
			byKey[key] = g
			groups = append(groups, g)
		}
		g.dates = append(g.dates, date.Format("2006-01-02"))
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, g := range groups {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := h.weather.Forecast(ctx, g.point.Lat, g.point.Lng, g.dates)
			if err != nil {
				slog.Error("trip weather: forecast failed", "trip_id", t.ID, "error", err)
			}
			mu.Lock()
			out = append(out, res...)
			mu.Unlock()
		}()
	}
	wg.Wait()
	sort.Slice(out, func(i, j int) bool { return out[i].Date < out[j].Date })
	return out, nil
}

// destination geocodes the trip's destination text, or nil when it is empty
// or cannot be located.
func (h *TripWeatherHandler) destination(ctx context.Context, text string) *location.Point {
	key := strings.ToLower(strings.TrimSpace(text))
	if h.cities == nil || key == "" {
		return nil
	}
	if cached, ok := h.destinations.Load(key); ok {
		return cached.(*location.Point)
	}
	p, err := h.cities.CityCenter(ctx, text, "en")
	if err != nil {
		slog.Warn("trip weather: destination lookup failed", "error", err)
		return nil // transient: do not cache
	}
	if h.destinationsCount.Load() < maxCachedDestinations {
		if _, loaded := h.destinations.LoadOrStore(key, p); !loaded {
			h.destinationsCount.Add(1)
		}
	}
	return p
}

// dayPoints picks each day's weather location (days in date order): the stay
// slept in that night, else the day's first pinned place, else the previous
// day's location. nil = none found.
func dayPoints(days []trip.Day, acts map[string][]activity.Activity, stays []accommodation.Accommodation) []*location.Point {
	out := make([]*location.Point, len(days))
	var prev *location.Point
	for i, d := range days {
		date := civilDate(d.Date)
		var p *location.Point
		for _, s := range stays {
			if !date.Before(civilDate(s.CheckIn)) && date.Before(civilDate(s.CheckOut)) && pinned(s.Lat, s.Lng) {
				p = &location.Point{Lat: *s.Lat, Lng: *s.Lng}
				break
			}
		}
		if p == nil {
			for _, a := range acts[d.ID] {
				if a.Type != activity.TypeLocation {
					continue
				}
				var pl activity.LocationPayload
				if json.Unmarshal(a.Payload, &pl) == nil && pinned(pl.Lat, pl.Lng) {
					p = &location.Point{Lat: *pl.Lat, Lng: *pl.Lng}
					break
				}
			}
		}
		if p == nil {
			p = prev
		}
		out[i], prev = p, p
	}
	return out
}

// pinned reports whether a coordinate is set (0,0 means "not located").
func pinned(lat, lng *float64) bool {
	return lat != nil && lng != nil && !(*lat == 0 && *lng == 0)
}
