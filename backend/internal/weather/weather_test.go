package weather

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestClientDaily(t *testing.T) {
	var query string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query = r.URL.RawQuery
		_, _ = w.Write([]byte(`{"daily":{"time":["2026-10-28","2026-10-29"],
			"weather_code":[61,null],"temperature_2m_max":[31.2,30],"temperature_2m_min":[24.1,23]}}`))
	}))
	defer srv.Close()
	c := &Client{baseURL: srv.URL, client: srv.Client()}

	days, err := c.Daily(context.Background(), -8.6705, 115.2126, "2026-10-28", "2026-10-29")
	if err != nil {
		t.Fatal(err)
	}
	// The day with a null value is left out.
	if len(days) != 1 || days[0] != (Day{Date: "2026-10-28", WeatherCode: 61, TempMin: 24.1, TempMax: 31.2}) {
		t.Fatalf("days = %+v", days)
	}
	want := "daily=weather_code%2Ctemperature_2m_max%2Ctemperature_2m_min&end_date=2026-10-29&latitude=-8.67&longitude=115.21&start_date=2026-10-28&timezone=auto"
	if query != want {
		t.Fatalf("query = %s", query)
	}
}

func TestClientDailyProviderError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":true}`, http.StatusBadRequest)
	}))
	defer srv.Close()
	c := &Client{baseURL: srv.URL, client: srv.Client()}
	if _, err := c.Daily(context.Background(), 1, 2, "2026-10-28", "2026-10-28"); err == nil {
		t.Fatal("want error")
	}
}

// fakeDaily counts upstream calls and returns one day per requested date.
type fakeDaily struct {
	calls  atomic.Int32
	starts []string
	err    error
}

func (f *fakeDaily) Daily(_ context.Context, lat, _ float64, start, end string) ([]Day, error) {
	f.calls.Add(1)
	f.starts = append(f.starts, start+".."+end)
	if f.err != nil {
		return nil, f.err
	}
	var out []Day
	for _, d := range []string{"2026-10-28", "2026-10-29", "2026-10-30"} {
		if d >= start && d <= end {
			out = append(out, Day{Date: d, WeatherCode: int(lat), TempMin: 20, TempMax: 30})
		}
	}
	return out, nil
}

func newTestService(t *testing.T, f *fakeDaily) (*Service, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return &Service{rdb: rdb, client: f}, mr
}

func TestForecastCachesPerDay(t *testing.T) {
	f := &fakeDaily{}
	s, mr := newTestService(t, f)
	ctx := context.Background()

	first, err := s.Forecast(ctx, 3.004, 101.996, []string{"2026-10-28", "2026-10-29"})
	if err != nil || len(first) != 2 {
		t.Fatalf("first = %+v, err = %v", first, err)
	}
	if !mr.Exists("weather:3.00:102.00:2026-10-28") || mr.TTL("weather:3.00:102.00:2026-10-28") != cacheTTL {
		t.Fatalf("keys = %v", mr.Keys())
	}

	// Hit: no upstream call, same answer (nearby point rounds to the same key).
	second, err := s.Forecast(ctx, 2.996, 102.001, []string{"2026-10-28", "2026-10-29"})
	if err != nil || f.calls.Load() != 1 || len(second) != 2 || second[0] != first[0] || second[1] != first[1] {
		t.Fatalf("second = %+v, calls = %d, err = %v", second, f.calls.Load(), err)
	}

	// Partial hit: only the missing day is fetched.
	third, err := s.Forecast(ctx, 3, 102, []string{"2026-10-28", "2026-10-29", "2026-10-30"})
	if err != nil || len(third) != 3 || third[2].Date != "2026-10-30" || f.starts[1] != "2026-10-30..2026-10-30" {
		t.Fatalf("third = %+v, starts = %v, err = %v", third, f.starts, err)
	}
}

func TestForecastUpstreamErrorKeepsCachedDays(t *testing.T) {
	f := &fakeDaily{}
	s, _ := newTestService(t, f)
	ctx := context.Background()
	if _, err := s.Forecast(ctx, 3, 102, []string{"2026-10-28"}); err != nil {
		t.Fatal(err)
	}
	f.err = errors.New("down")
	days, err := s.Forecast(ctx, 3, 102, []string{"2026-10-28", "2026-10-29"})
	if err == nil || len(days) != 1 || days[0].Date != "2026-10-28" {
		t.Fatalf("days = %+v, err = %v", days, err)
	}
}

func TestForecastWorksWithoutRedis(t *testing.T) {
	f := &fakeDaily{}
	s, mr := newTestService(t, f)
	mr.Close()
	days, err := s.Forecast(context.Background(), 3, 102, []string{"2026-10-28", "2026-10-29"})
	if err != nil || len(days) != 2 || f.calls.Load() != 1 {
		t.Fatalf("days = %+v, calls = %d, err = %v", days, f.calls.Load(), err)
	}
}
