// Package middleware provides HTTP middleware for the Navisha API.
// Phase 3D: Rate limiting middleware using Redis sorted sets for
// per-user sliding-window counters.
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/jhontea/navisha/backend/pkg/jwt"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements per-user sliding-window rate limiting backed by Redis.
// Each user gets a sorted set keyed by `ratelimit:{userID}:{window}` where
// scores are Unix timestamps in nanoseconds. Expired entries are trimmed on
// each check.
type RateLimiter struct {
	rdb       *redis.Client
	jwtSvc    *jwt.Service // optional: validates JWT before auth middleware runs
	config    RateLimitConfig
	llmRoutes map[string]bool
	seq    atomic.Uint64
}

var slidingWindowScript = redis.NewScript(`
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[2]) then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[5]))
  return 0
end
redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[5]))
return 1
`)

// RateLimitConfig defines the per-endpoint-group rate limits.
type RateLimitConfig struct {
	Enabled       bool
	AuthPerMinute int // e.g. 20 req/min for /auth/*
	LLMPerMinute  int // e.g. 5 req/min for LLM endpoints
	GeneralPerMin int // e.g. 100 req/min for everything else
	// LLMRoutes lists "METHOD /route/:pattern" keys that use the LLM bucket,
	// the same keys as the LLM timeouts in cmd/server/routes.go.
	LLMRoutes []string
}

// NewRateLimiter creates a rate limiter. Pass nil jwtSvc to skip JWT extraction
// (then only context UserIDKey or IP is used for identification).
func NewRateLimiter(rdb *redis.Client, jwtSvc *jwt.Service, cfg RateLimitConfig) *RateLimiter {
	llm := make(map[string]bool, len(cfg.LLMRoutes))
	for _, route := range cfg.LLMRoutes {
		llm[route] = true
	}
	return &RateLimiter{rdb: rdb, jwtSvc: jwtSvc, config: cfg, llmRoutes: llm}
}

// Limit returns an Echo middleware that rate-limits requests per authenticated
// user, falling back to per-IP for unauthenticated public endpoints.
// Uses separate Redis keys per bucket type (auth, llm, general) so hitting
// an auth rate limit doesn't block the user from their own data.
// The limit is selected based on the request path:
//   - /auth/*     → AuthPerMinute  (key: ratelimit:auth:{id})
//   - LLMRoutes (method + route pattern) → LLMPerMinute  (key: ratelimit:llm:{id})
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
			ident := rl.identifier(c)

			bucket, limit := rl.bucketAndLimit(c.Request().Method, c.Path(), c.Request().URL.Path)
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

func (rl *RateLimiter) identifier(c echo.Context) string {
	if userID, ok := c.Get(UserIDKey).(string); ok && userID != "" {
		return userID
	}
	if rl.jwtSvc != nil {
		if token := tokenFromRequest(c); token != "" {
			if userID, err := rl.jwtSvc.ValidateAccessToken(token); err == nil && userID != "" {
				return userID
			}
		}
	}
	return "ip:" + c.RealIP()
}

// bucketAndLimit returns the Redis key bucket name and per-minute limit for a path.
// bucketAndLimit picks the bucket from the matched route (c.Path()), so only
// the calls that actually run the LLM use the strict bucket: viewing a summary
// (GET) is general, generating a day preview (POST) is LLM.
func (rl *RateLimiter) bucketAndLimit(method, route, path string) (string, int) {
	if rl.llmRoutes[method+" "+route] {
		return "llm", rl.config.LLMPerMinute
	}
	// Auth endpoints
	if matchPath(path, "/api/v1/auth") {
		return "auth", rl.config.AuthPerMinute
	}
	return "general", rl.config.GeneralPerMin
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
// IMPORTANT: the request is added to the sorted set AFTER the limit check
// so that rate-limited requests do not pollute the window.
func (rl *RateLimiter) check(ctx context.Context, redisKey string, limit int) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-time.Minute)

	member := strconv.FormatInt(now.UnixNano(), 10) + "-" + strconv.FormatUint(rl.seq.Add(1), 10)
	result, err := slidingWindowScript.Run(ctx, rl.rdb, []string{redisKey},
		windowStart.UnixNano(), limit, now.UnixNano(), member, 120).Int()
	if err != nil {
		return false, fmt.Errorf("rate limit redis script: %w", err)
	}
	return result == 1, nil
}
