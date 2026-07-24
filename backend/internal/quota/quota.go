// Package quota provides a shared daily AI generation quota checker used by
// both autogen (trip generate, build-around) and summary handlers.
// All AI features share one Redis counter per user per UTC day.
// The quota limit is read from DB (app_settings table) with Redis cache.
package quota

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/redis/go-redis/v9"
)

const (
	// cacheKey is the Redis key for the cached quota limit value.
	cacheKey = "app:config:autogen_daily_quota"
	// cacheTTL is how long the quota limit is cached in Redis.
	cacheTTL = 60 * time.Second
	// defaultLimit is the fallback when no value is set in the DB.
	defaultLimit = 10
)

// Checker holds Redis + DB references for quota operations.
type Checker struct {
	rdb *redis.Client
	db  *pgxpool.Pool
}

// NewChecker creates a quota checker. Pass nil for either to disable.
func NewChecker(rdb *redis.Client, db *pgxpool.Pool) *Checker {
	return &Checker{rdb: rdb, db: db}
}

// Enabled returns true if quota checking is active (Redis is wired).
func (c *Checker) Enabled() bool {
	return c.rdb != nil
}

// limit returns the current daily quota limit.
// Reads from Redis cache → DB (app_settings) → defaultLimit (10).
func (c *Checker) limit(ctx context.Context) int {
	// 1. Redis cache
	if c.rdb != nil {
		val, err := c.rdb.Get(ctx, cacheKey).Result()
		if err == nil {
			if n, e := strconv.Atoi(val); e == nil && n > 0 {
				return n
			}
		}
	}
	// 2. DB
	if c.db != nil {
		var val string
		err := c.db.QueryRow(ctx, "SELECT value FROM app_settings WHERE key='autogen_daily_quota'").Scan(&val)
		if err == nil {
			if n, e := strconv.Atoi(val); e == nil && n > 0 {
				if c.rdb != nil {
					_ = c.rdb.Set(ctx, cacheKey, val, cacheTTL).Err()
				}
				return n
			}
		}
	}
	return defaultLimit
}

// userKey builds the Redis key for a user's daily AI counter.
// Date is UTC so the counter resets at 00:00 UTC (07:00 WIB) every day.
func userKey(userID string) string {
	today := time.Now().UTC().Format("2006-01-02")
	return fmt.Sprintf("ratelimit:autogen:daily:%s:%s", userID, today)
}

// nextUTCMidnight returns the time of the next 00:00 UTC.
func nextUTCMidnight() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
}

// Consume atomically increments the user's daily AI counter.
// Returns nil if within quota, or an *echo.HTTPError (429) if exceeded.
// Call this BEFORE executing any AI generation.
func (c *Checker) Consume(ctx echo.Context, userID string) *echo.HTTPError {
	if !c.Enabled() {
		return nil
	}
	limit := c.limit(ctx.Request().Context())
	if limit <= 0 {
		return nil // 0 in DB means unlimited
	}

	key := userKey(userID)
	used, err := c.rdb.Incr(ctx.Request().Context(), key).Result()
	if err != nil {
		slog.Warn("quota: INCR failed", "user_id", userID, "err", err)
		return nil // fail open
	}
	if used == 1 {
		ttl := time.Until(nextUTCMidnight())
		if ttl > 0 {
			if err := c.rdb.Expire(ctx.Request().Context(), key, ttl).Err(); err != nil {
				slog.Warn("quota: EXPIRE failed", "user_id", userID, "err", err)
			}
		}
	}
	if used > int64(limit) {
		_, _ = c.rdb.Decr(ctx.Request().Context(), key).Result()
		return echo.NewHTTPError(http.StatusTooManyRequests, map[string]any{
			"code":      "DAILY_QUOTA_EXCEEDED",
			"message":   fmt.Sprintf("Daily AI generation limit reached (%d/%d). Resets at 00:00 UTC.", limit, limit),
			"used":      limit,
			"limit":     limit,
			"resets_at": nextUTCMidnight().UTC().Format(time.RFC3339),
		})
	}
	return nil
}

// Refund decrements the user's daily counter by 1 (floor 0).
// Call this AFTER Consume when the AI generation fails due to a server/infra
// error (timeout, network, provider 5xx — i.e. ErrLLMUnavailable).
// Do NOT refund for user errors (invalid prompt, bad input).
func (c *Checker) Refund(ctx echo.Context, userID string) {
	if !c.Enabled() {
		return
	}
	key := userKey(userID)
	if _, err := c.rdb.Decr(ctx.Request().Context(), key).Result(); err != nil {
		slog.Warn("quota: DECR refund failed", "user_id", userID, "err", err)
	}
}

// Status is the response shape for the quota GET endpoint.
type Status struct {
	Used      int    `json:"used"`
	Limit     int    `json:"limit"`
	Remaining int    `json:"remaining"`
	ResetsAt  string `json:"resets_at"`
	Disabled  bool   `json:"disabled,omitempty"`
}

// GetStatus returns the current quota status for a user without consuming.
func (c *Checker) GetStatus(ctx echo.Context, userID string) Status {
	if !c.Enabled() {
		return Status{Disabled: true}
	}
	limit := c.limit(ctx.Request().Context())
	if limit <= 0 {
		return Status{Disabled: true}
	}
	key := userKey(userID)
	used, err := c.rdb.Get(ctx.Request().Context(), key).Int()
	if err != nil && err != redis.Nil {
		slog.Warn("quota: GET failed", "user_id", userID, "err", err)
		used = 0
	}
	remaining := limit - used
	if remaining < 0 {
		remaining = 0
	}
	return Status{
		Used:      used,
		Limit:     limit,
		Remaining: remaining,
		ResetsAt:  nextUTCMidnight().UTC().Format(time.RFC3339),
	}
}
