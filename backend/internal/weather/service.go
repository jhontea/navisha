package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

// cacheTTL keeps a forecast for a few hours; Open-Meteo updates hourly but a
// day's min/max barely moves within that window.
const cacheTTL = 3 * time.Hour

// dailyFetcher is the upstream source (Open-Meteo); an interface so tests can
// fake it.
type dailyFetcher interface {
	Daily(ctx context.Context, lat, lng float64, start, end string) ([]Day, error)
}

// Service serves forecasts from Redis, fetching only the days it lacks.
type Service struct {
	rdb    *redis.Client
	client dailyFetcher
	// group collapses concurrent identical misses into one upstream call.
	group singleflight.Group
}

func NewService(rdb *redis.Client, client *Client) *Service {
	return &Service{rdb: rdb, client: client}
}

// Round snaps a coordinate to 2 decimals (~1 km), so nearby places share
// one cache entry and one upstream call.
func Round(v float64) float64 { return math.Round(v*100) / 100 }

func cacheKey(lat, lng float64, date string) string {
	return fmt.Sprintf("weather:%.2f:%.2f:%s", lat, lng, date)
}

// Forecast returns the forecast at (lat, lng) for the given dates
// (YYYY-MM-DD, ascending), in date order. Dates without data are left out.
// When the upstream fails it returns the cached days found plus the error.
// Redis errors are logged and the upstream is used instead (fail-open).
func (s *Service) Forecast(ctx context.Context, lat, lng float64, dates []string) ([]Day, error) {
	if len(dates) == 0 {
		return nil, nil
	}
	lat, lng = Round(lat), Round(lng)
	keys := make([]string, len(dates))
	for i, d := range dates {
		keys[i] = cacheKey(lat, lng, d)
	}
	vals, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		slog.Warn("weather: redis cache read failed, fetching upstream", "error", err)
		vals = nil
	}

	out := make([]Day, 0, len(dates))
	var missing []string
	for i, date := range dates {
		if i < len(vals) {
			if raw, ok := vals[i].(string); ok {
				var day Day
				if json.Unmarshal([]byte(raw), &day) == nil {
					out = append(out, day)
					continue
				}
			}
		}
		missing = append(missing, date)
	}
	if len(missing) == 0 {
		return out, nil
	}

	// One call for the whole span of missing days; it gets its own context
	// so one caller giving up doesn't fail the others sharing it.
	start, end := missing[0], missing[len(missing)-1]
	v, err, _ := s.group.Do(fmt.Sprintf("%.2f:%.2f:%s:%s", lat, lng, start, end), func() (any, error) {
		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		slog.Info("weather: upstream fetch", "lat", lat, "lng", lng, "start", start, "end", end)
		days, err := s.client.Daily(fetchCtx, lat, lng, start, end)
		if err != nil {
			return nil, err
		}
		pipe := s.rdb.Pipeline()
		for _, d := range days {
			if b, err := json.Marshal(d); err == nil {
				pipe.Set(fetchCtx, cacheKey(lat, lng, d.Date), b, cacheTTL)
			}
		}
		if _, err := pipe.Exec(fetchCtx); err != nil {
			slog.Warn("weather: redis cache write failed", "error", err)
		}
		return days, nil
	})
	if err != nil {
		return out, err
	}

	want := make(map[string]bool, len(missing))
	for _, d := range missing {
		want[d] = true
	}
	for _, d := range v.([]Day) {
		if want[d.Date] {
			out = append(out, d)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Date < out[j].Date })
	return out, nil
}
