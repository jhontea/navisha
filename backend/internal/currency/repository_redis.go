package currency

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	pkgcurrency "github.com/ahmadhafizh/navisha/backend/pkg/currency"
	"github.com/redis/go-redis/v9"
)

// CurrencyFreaks returns rates with USD as the only base. We cache the full
// USD-keyed map in Redis and derive cross-rates client-side via
// `from→to = rates[to] / rates[from]`.

type redisRepository struct {
	rdb    *redis.Client
	client *pkgcurrency.Client
	ttl    time.Duration
}

func NewRedisRepository(rdb *redis.Client, client *pkgcurrency.Client, ttlSeconds int) Repository {
	return &redisRepository{
		rdb:    rdb,
		client: client,
		ttl:    time.Duration(ttlSeconds) * time.Second,
	}
}

const usdCacheKey = "rates:USD"

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
	} else if errors.Is(err, redis.Nil) {
		// Cache miss — proceed to upstream fetch below.
	} else {
		// Redis error (connection refused, timeout) — log and fall through
		// to upstream fetch so the app stays functional without Redis.
		// The cache write will also be skipped gracefully below.
	}

	// Cache miss or Redis unavailable → upstream fetch
	resp, err := r.client.Latest(ctx, SupportedCurrencies)
	if err != nil {
		return nil, err
	}
	// Always include USD = 1.0 so cross-rate maths needs no special case.
	resp.Rates["USD"] = 1.0

	out := &cachedRates{Date: resp.Date, Rates: resp.Rates}
	if b, err := json.Marshal(out); err == nil {
		_ = r.rdb.Set(ctx, usdCacheKey, b, r.ttl).Err()
	}
	return out, nil
}

func (r *redisRepository) GetRate(base, target string) (*Rate, error) {
	if !IsSupported(base) || !IsSupported(target) {
		return nil, ErrUnsupported
	}
	if base == target {
		return &Rate{Base: base, Target: target, Rate: 1.0, FetchedAt: time.Now()}, nil
	}

	usd, err := r.fetchUSD(context.Background())
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

func (r *redisRepository) GetRates(base string) ([]Rate, error) {
	if !IsSupported(base) {
		return nil, ErrUnsupported
	}
	usd, err := r.fetchUSD(context.Background())
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
