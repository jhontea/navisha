// Package middleware provides HTTP middleware for the Navisha API.
// Phase 3D: Rate limiting middleware using Redis sorted sets for
// per-user sliding-window counters.
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements per-user sliding-window rate limiting backed by Redis.
// Each user gets a sorted set keyed by `ratelimit:{userID}:{window}` where
// scores are Unix timestamps in nanoseconds. Expired entries are trimmed on
// each check.
type RateLimiter struct {
	rdb    *redis.Client
	jwtSvc *jwt.Service // optional: for extracting user ID from JWT before auth middleware runs
	config RateLimitConfig
}

// RateLimitConfig defines the per-endpoint-group rate limits.
type RateLimitConfig struct {
	Enabled       bool
	AuthPerMinute int // e.g. 20 req/min for /auth/*
	LLMPerMinute  int // e.g. 5 req/min for LLM endpoints
	GeneralPerMin int // e.g. 100 req/min for everything else
}

// NewRateLimiter creates a rate limiter. Pass nil jwtSvc to skip JWT extraction
// (then only context UserIDKey or IP is used for identification).
func NewRateLimiter(rdb *redis.Client, jwtSvc *jwt.Service, cfg RateLimitConfig) *RateLimiter {
	return &RateLimiter{rdb: rdb, jwtSvc: jwtSvc, config: cfg}
}

// Limit returns an Echo middleware that rate-limits requests per authenticated
// user, falling back to per-IP for unauthenticated public endpoints.
// Uses separate Redis keys per bucket type (auth, llm, general) so hitting
// an auth rate limit doesn't block the user from their own data.
// The limit is selected based on the request path:
//   - /auth/*     → AuthPerMinute  (key: ratelimit:auth:{id})
//   - /trips/generate, /trips/:id/summary → LLMPerMinute  (key: ratelimit:llm:{id})
//   - everything else → GeneralPerMin  (key: ratelimit:general:{id})
func (rl *RateLimiter) Limit() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !rl.config.Enabled {
				return next(c)
			}

			// Identify the caller. Priority:
			// 1. Context UserIDKey (set by auth middleware, if it ran before us)
			// 2. JWT Authorization header (unverified — rate-limit bucketing only)
			// 3. Client IP (fallback for public/unauthenticated routes)
			ident := ""
			if userID, ok := c.Get(UserIDKey).(string); ok && userID != "" {
				ident = userID
			} else if rl.jwtSvc != nil {
				if token := tokenFromRequest(c); token != "" {
					if userID, err := rl.jwtSvc.ExtractUserIDUnverified(token); err == nil && userID != "" {
						ident = userID
					}
				}
			}
			if ident == "" {
				ident = "ip:" + c.RealIP()
			}

			bucket, limit := rl.bucketAndLimit(c.Request().URL.Path)
			if limit <= 0 {
				return next(c)
			}

			// Separate Redis keys per bucket so hitting the auth limit (20/min)
			// doesn't also block general or LLM requests for the same user.
			redisKey := fmt.Sprintf("ratelimit:%s:%s", bucket, ident)

			allowed, err := rl.check(c.Request().Context(), redisKey, limit)
			if err != nil {
				// On Redis error, allow the request (fail open) but log.
				c.Logger().Warnf("rate limiter check failed for key %s: %v", redisKey, err)
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

// bucketAndLimit returns the Redis key bucket name and per-minute limit for a path.
func (rl *RateLimiter) bucketAndLimit(path string) (string, int) {
	// LLM endpoints (expensive) — exact generate path or /trips/:id/summary suffix.
	// Must NOT match /trips/:id/expenses/summary — that's a cheap DB aggregate.
	if path == "/api/v1/trips/generate" || isLLMSummaryPath(path) {
		return "llm", rl.config.LLMPerMinute
	}
	// Auth endpoints
	if matchPath(path, "/api/v1/auth") {
		return "auth", rl.config.AuthPerMinute
	}
	return "general", rl.config.GeneralPerMin
}

// isLLMSummaryPath checks if path is exactly /api/v1/trips/<uuid>/summary
// (not /api/v1/trips/<uuid>/expenses/summary or other /summary variants).
func isLLMSummaryPath(path string) bool {
	if !strings.HasPrefix(path, "/api/v1/trips/") || !strings.HasSuffix(path, "/summary") {
		return false
	}
	// Must NOT contain another slash between /trips/ and /summary
	// (e.g. /trips/:id/expenses/summary has an extra /expenses/ segment).
	inner := path[len("/api/v1/trips/") : len(path)-len("/summary")]
	return !strings.Contains(inner, "/")
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
func (rl *RateLimiter) check(ctx context.Context, redisKey string, limit int) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-time.Minute)

	pipe := rl.rdb.Pipeline()

	// Remove entries outside the sliding window.
	pipe.ZRemRangeByScore(ctx, redisKey, "0", strconv.FormatInt(windowStart.UnixNano(), 10))

	// Add current request.
	member := strconv.FormatInt(now.UnixNano(), 10)
	pipe.ZAdd(ctx, redisKey, redis.Z{Score: float64(now.UnixNano()), Member: member})

	// Count entries still in the window.
	countCmd := pipe.ZCard(ctx, redisKey)

	// Set expiry on the key so stale users don't accumulate.
	pipe.Expire(ctx, redisKey, 2*time.Minute)

	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		return false, fmt.Errorf("rate limit redis pipe: %w", err)
	}

	count, err := countCmd.Result()
	if err != nil {
		return false, fmt.Errorf("rate limit zcard: %w", err)
	}

	return count <= int64(limit), nil
}
