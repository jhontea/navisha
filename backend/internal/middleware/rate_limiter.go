// Package middleware provides HTTP middleware for the Navisha API.
// Phase 3D: Rate limiting middleware using Redis sorted sets for
// per-user sliding-window counters.
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements per-user sliding-window rate limiting backed by Redis.
// Each user gets a sorted set keyed by `ratelimit:{userID}:{window}` where
// scores are Unix timestamps in nanoseconds. Expired entries are trimmed on
// each check.
type RateLimiter struct {
	rdb    *redis.Client
	config RateLimitConfig
}

// RateLimitConfig defines the per-endpoint-group rate limits.
type RateLimitConfig struct {
	Enabled       bool
	AuthPerMinute int // e.g. 20 req/min for /auth/*
	LLMPerMinute  int // e.g. 5 req/min for LLM endpoints
	GeneralPerMin int // e.g. 100 req/min for everything else
}

// NewRateLimiter creates a rate limiter. Pass nil config to disable.
func NewRateLimiter(rdb *redis.Client, cfg RateLimitConfig) *RateLimiter {
	return &RateLimiter{rdb: rdb, config: cfg}
}

// Limit returns an Echo middleware that rate-limits requests per authenticated
// user. Unauthenticated routes are not rate-limited (they fall through).
// The limit is selected based on the request path:
//   - /auth/*     → AuthPerMinute
//   - /trips/generate, /trips/:id/summary → LLMPerMinute
//   - everything else → GeneralPerMin
func (rl *RateLimiter) Limit() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !rl.config.Enabled {
				return next(c)
			}

			userID, ok := c.Get(UserIDKey).(string)
			if !ok || userID == "" {
				// Not authenticated yet; skip rate limiting (auth middleware
				// already handles unauthenticated requests).
				return next(c)
			}

			limit := rl.limitForPath(c.Request().URL.Path)
			if limit <= 0 {
				return next(c)
			}

			allowed, err := rl.check(c.Request().Context(), userID, limit)
			if err != nil {
				// On Redis error, allow the request (fail open) but log.
				c.Logger().Warnf("rate limiter check failed for user %s: %v", userID, err)
				return next(c)
			}
			if !allowed {
				return echo.NewHTTPError(http.StatusTooManyRequests,
					fmt.Sprintf("rate limit exceeded (%d req/min). Please slow down.", limit))
			}

			return next(c)
		}
	}
}

func (rl *RateLimiter) limitForPath(path string) int {
	// LLM endpoints (expensive)
	if matchPath(path, "/api/v1/trips/generate") || matchPath(path, "/api/v1/trips/:id/summary") {
		return rl.config.LLMPerMinute
	}
	// Auth endpoints
	if matchPath(path, "/api/v1/auth") {
		return rl.config.AuthPerMinute
	}
	return rl.config.GeneralPerMin
}

// matchPath is a simple prefix check. For more precise matching, we'd use
// Echo's route matching, but prefix is sufficient for rate-limit bucketing.
func matchPath(path, prefix string) bool {
	return len(path) >= len(prefix) && path[:len(prefix)] == prefix
}

// check implements a sliding-window rate limit using a Redis sorted set.
// Each request is recorded with a score equal to the current nanosecond
// timestamp. Entries older than the window (60s) are trimmed, then the
// count of remaining entries is compared against the limit.
func (rl *RateLimiter) check(ctx context.Context, userID string, limit int) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-time.Minute)
	key := fmt.Sprintf("ratelimit:%s", userID)

	pipe := rl.rdb.Pipeline()

	// Remove entries outside the sliding window.
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))

	// Add current request.
	member := strconv.FormatInt(now.UnixNano(), 10)
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixNano()), Member: member})

	// Count entries still in the window.
	countCmd := pipe.ZCard(ctx, key)

	// Set expiry on the key so stale users don't accumulate.
	pipe.Expire(ctx, key, 2*time.Minute)

	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		return false, fmt.Errorf("rate limit redis pipe: %w", err)
	}

	count, err := countCmd.Result()
	if err != nil {
		return false, fmt.Errorf("rate limit zcard: %w", err)
	}

	return count <= int64(limit), nil
}
