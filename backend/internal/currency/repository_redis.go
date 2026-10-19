package currency

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	pkgcurrency "github.com/jhontea/navisha/backend/pkg/currency"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

// redisRepository implements currency.Repository using CurrencyFreaks as the
// upstream source and Redis as a cache. Rates are fetched with USD as base,
// then cross-rates are derived client-side.

// ratesFetcher is the upstream source (CurrencyFreaks); an interface so tests
// can fake it.
type ratesFetcher interface {
	Latest(ctx context.Context, symbols []string) (*pkgcurrency.LatestRates, error)
}

type redisRepository struct {
	rdb    *redis.Client
	client ratesFetcher
	ttl    time.Duration
	// group collapses concurrent cache misses into one upstream call.
	group singleflight.Group
}

func NewRedisRepository(rdb *redis.Client, client *pkgcurrency.Client, ttlSeconds int) Repository {
	return &redisRepository{
		rdb:    rdb,
		client: client,
		ttl:    time.Duration(ttlSeconds) * time.Second,
	}
}

const usdCacheKey = "rates:USD"

// usdLastKey keeps the last good table without a TTL, served when the
// upstream fails so expenses can still be saved.
const usdLastKey = "rates:USD:last"

// staleRetry is how long a fallback table is cached before the upstream is
// tried again.
const staleRetry = 5 * time.Minute

type cachedRates struct {
	Date  time.Time          `json:"date"`
	Rates map[string]float64 `json:"rates"`
}

// fetchUSD returns the USD-based rates table, using Redis cache when fresh
// and falling back to the upstream API on miss or Redis error (fail-open).
func (r *redisRepository) fetchUSD(ctx context.Context) (*cachedRates, error) {
	if cached, err := r.rdb.Get(ctx, usdCacheKey).Result(); err == nil {
		var out cachedRates
		if jsonErr := json.Unmarshal([]byte(cached), &out); jsonErr == nil {
			return &out, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// Redis error (connection refused, timeout) — log and fall through
		// to upstream fetch so the app stays functional without Redis.
		// A plain cache miss (redis.Nil) falls through silently.
		slog.Warn("currency: redis cache read failed, fetching upstream", "error", err)
	}

	// Cache miss or Redis unavailable: one upstream call, shared by every
	// request that misses at the same time (saves the free-tier quota). The
	// call gets its own context so one caller giving up doesn't fail the rest.
	v, err, _ := r.group.Do(usdCacheKey, func() (any, error) {
		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
		defer cancel()
		return r.fetchUpstream(fetchCtx)
	})
	if err != nil {
		return nil, err
	}
	return v.(*cachedRates), nil
}

// fetchUpstream gets a fresh table from CurrencyFreaks and caches it. If the
// upstream fails it serves the last good table (cached briefly so the
// upstream is not hit on every request while it is down).
func (r *redisRepository) fetchUpstream(ctx context.Context) (*cachedRates, error) {
	resp, err := r.client.Latest(ctx, SupportedCurrencies)
	if err != nil {
		last, raw, ok := r.lastGood(ctx)
		if !ok {
			return nil, err
		}
		slog.Warn("currency: upstream failed, using last known rates", "error", err, "rates_date", last.Date)
		_ = r.rdb.Set(ctx, usdCacheKey, raw, staleRetry).Err()
		return last, nil
	}
	// Always include USD = 1.0 so cross-rate maths needs no special case.
	resp.Rates["USD"] = 1.0

	out := &cachedRates{Date: resp.Date, Rates: resp.Rates}
	if b, err := json.Marshal(out); err == nil {
		_ = r.rdb.Set(ctx, usdCacheKey, b, r.ttl).Err()
		_ = r.rdb.Set(ctx, usdLastKey, b, 0).Err()
	}
	return out, nil
}

// lastGood returns the last table fetched successfully, if any.
func (r *redisRepository) lastGood(ctx context.Context) (*cachedRates, string, bool) {
	raw, err := r.rdb.Get(ctx, usdLastKey).Result()
	if err != nil {
		return nil, "", false
	}
	var out cachedRates
	if json.Unmarshal([]byte(raw), &out) != nil || len(out.Rates) == 0 {
		return nil, "", false
	}
	return &out, raw, true
}

func (r *redisRepository) GetRate(parent context.Context, base, target string) (*Rate, error) {
	if !IsSupported(base) || !IsSupported(target) {
		return nil, ErrUnsupported
	}
	if base == target {
		return &Rate{Base: base, Target: target, Rate: 1.0, FetchedAt: time.Now()}, nil
	}

	// Use a cancellable context so upstream fetches respect request deadlines.
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	usd, err := r.fetchUSD(ctx)
	if err != nil {
		return nil, err
	}
	rate, err := crossRate(usd.Rates, base, target)
	if err != nil {
		return nil, err
	}
	return &Rate{
		Base:      base,
		Target:    target,
		Rate:      rate,
		FetchedAt: usd.Date,
	}, nil
}

func (r *redisRepository) GetRates(parent context.Context, base string) ([]Rate, error) {
	if !IsSupported(base) {
		return nil, ErrUnsupported
	}
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	usd, err := r.fetchUSD(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Rate, 0, len(SupportedCurrencies))
	for _, t := range SupportedCurrencies {
		r, err := crossRate(usd.Rates, base, t)
		if err != nil {
			continue // skip missing targets rather than fail the whole list
		}
		out = append(out, Rate{Base: base, Target: t, Rate: r, FetchedAt: usd.Date})
	}
	return out, nil
}
