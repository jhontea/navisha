package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/currency"
	"github.com/ahmadhafizh/navisha/backend/internal/migrate"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Structured JSON logger (Phase 3D).
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Database — Phase 3D: tuned connection pool.
	dbCfg, err := pgxpool.ParseConfig(cfg.DB.URL)
	if err != nil {
		// Do not log cfg.DB.URL — it contains the database password.
		slog.Error("failed to parse database url", "error", "invalid connection string")
		os.Exit(1)
	}
	if cfg.DB.PoolSize > 0 {
		dbCfg.MaxConns = int32(cfg.DB.PoolSize)
	}
	if cfg.DB.MaxConns > 0 {
		dbCfg.MaxConns = cfg.DB.MaxConns
	}
	if cfg.DB.MinConns > 0 {
		dbCfg.MinConns = cfg.DB.MinConns
	}
	if cfg.DB.MaxConnLifetime > 0 {
		dbCfg.MaxConnLifetime = time.Duration(cfg.DB.MaxConnLifetime) * time.Second
	}
	if cfg.DB.MaxConnIdleTime > 0 {
		dbCfg.MaxConnIdleTime = time.Duration(cfg.DB.MaxConnIdleTime) * time.Second
	}
	db, err := pgxpool.NewWithConfig(context.Background(), dbCfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	if err := db.Ping(context.Background()); err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}
	slog.Info("database connected",
		"max_conns", dbCfg.MaxConns,
		"min_conns", dbCfg.MinConns,
		"region", databaseRegion(dbCfg.ConnConfig.Host),
		"pooler", strings.Contains(dbCfg.ConnConfig.Host, "-pooler."),
	)

	// Redis — Phase 3D: tuned connection pool.
	redisOpts, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		// Do not log cfg.Redis.URL — it may contain a password.
		slog.Error("failed to parse redis url", "error", "invalid connection string")
		os.Exit(1)
	}
	if cfg.Redis.PoolSize > 0 {
		redisOpts.PoolSize = cfg.Redis.PoolSize
	}
	if cfg.Redis.MinIdleConns > 0 {
		redisOpts.MinIdleConns = cfg.Redis.MinIdleConns
	}
	rdb := redis.NewClient(redisOpts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		slog.Error("failed to ping redis", "error", err)
		os.Exit(1)
	}
	// Loop 19: warn if Redis is not using TLS in a non-localhost environment.
	if !strings.HasPrefix(cfg.Redis.URL, "rediss://") &&
		!strings.Contains(cfg.Redis.URL, "localhost") &&
		!strings.Contains(cfg.Redis.URL, "127.0.0.1") {
		slog.Warn("redis is not using TLS — consider using rediss:// in production")
	}
	slog.Info("redis connected", "pool_size", redisOpts.PoolSize)
	defer rdb.Close()

	// Run pending database migrations (Loop 1: auto-migration on startup).
	migrator := migrate.New(db, "migrations")
	n, err := migrator.Run(context.Background())
	if err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}
	if n > 0 {
		slog.Info("migrations applied", "count", n)
	}

	// Populate supported currencies from config and rebuild the O(1) lookup map.
	currency.SupportedCurrencies = cfg.Currency.Supported
	currency.UpdateSupportedSet()

	a := wire(cfg, db, rdb)
	e := newServer(cfg, db, rdb, a)

	// Graceful shutdown
	go func() {
		addr := fmt.Sprintf(":%d", cfg.Server.Port)
		// Loop 10: Configure server-level timeouts to protect against
		// slow-loris attacks and hung connections.
		const (
			serverReadTimeout  = 15 * time.Second
			serverWriteTimeout = 315 * time.Second // exceeds 300s LLM timeout + 10s headroom
			serverIdleTimeout  = 120 * time.Second
			maxHeaderBytes     = 1 << 18 // 256KB (default 1MB is too generous)
		)
		e.Server.ReadTimeout = serverReadTimeout
		e.Server.WriteTimeout = serverWriteTimeout
		e.Server.IdleTimeout = serverIdleTimeout
		e.Server.MaxHeaderBytes = maxHeaderBytes
		slog.Info("server timeouts configured",
			"read_timeout", serverReadTimeout,
			"write_timeout", serverWriteTimeout,
			"idle_timeout", serverIdleTimeout,
			"max_header_bytes", maxHeaderBytes,
		)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		slog.Error("server shutdown error", "error", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}

func databaseRegion(host string) string {
	for _, part := range strings.Split(host, ".") {
		if strings.HasPrefix(part, "ap-") || strings.HasPrefix(part, "us-") ||
			strings.HasPrefix(part, "eu-") || strings.HasPrefix(part, "sa-") ||
			strings.HasPrefix(part, "ca-") || strings.HasPrefix(part, "me-") ||
			strings.HasPrefix(part, "af-") {
			return part
		}
	}
	return "unknown"
}
