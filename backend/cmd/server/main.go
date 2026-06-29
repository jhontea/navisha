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
	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"

	"github.com/ahmadhafizh/navisha/backend/internal/currency"

	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/integration"
	appMiddleware "github.com/ahmadhafizh/navisha/backend/internal/middleware"
	"github.com/ahmadhafizh/navisha/backend/internal/migrate"
	"github.com/ahmadhafizh/navisha/backend/internal/summary"
	"github.com/ahmadhafizh/navisha/backend/internal/transportation"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/ahmadhafizh/navisha/backend/internal/user"
	pkgcurrency "github.com/ahmadhafizh/navisha/backend/pkg/currency"
	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
	"github.com/ahmadhafizh/navisha/backend/pkg/oauth"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
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
	slog.Info("database connected", "max_conns", dbCfg.MaxConns, "min_conns", dbCfg.MinConns)

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

	// Populate supported currencies from config
	currency.SupportedCurrencies = cfg.Currency.Supported

	// Services
	jwtSvc := jwt.NewService(
		cfg.JWT.Secret,
		cfg.JWT.RefreshSecret,
		cfg.JWT.AccessTTL,
		cfg.JWT.RefreshTTL,
	)
	oauthCfg := oauth.NewGoogleConfig(
		cfg.Google.ClientID,
		cfg.Google.ClientSecret,
		cfg.Google.RedirectURL,
	)

	// User domain
	userRepo := user.NewPostgresRepository(db)
	userUsecase := user.NewUsecase(userRepo, jwtSvc, oauthCfg, cfg.App.AllowedEmails)
	userHandler := user.NewHandler(userUsecase, cfg.App.FrontendURL, cfg.App.CookieDomain, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)

	// Trip domain
	tripRepo := trip.NewPostgresRepository(db)
	tripUsecase := trip.NewUsecase(tripRepo)
	tripHandler := trip.NewHandler(tripUsecase)

	// Activity domain
	activityRepo := activity.NewPostgresRepository(db)
	activityUsecase := activity.NewUsecase(activityRepo)
	activityHandler := activity.NewHandler(activityUsecase)

	// Currency domain
	currencyClient := pkgcurrency.NewClient(cfg.Currency.APIKey)
	currencyRepo := currency.NewRedisRepository(rdb, currencyClient, cfg.Currency.CacheTTL)
	currencyUsecase := currency.NewUsecase(currencyRepo)
	currencyHandler := currency.NewHandler(currencyUsecase)

	// Expense domain (depends on currency.Usecase via Converter interface)
	expenseRepo := expense.NewPostgresRepository(db)
	expenseUsecase := expense.NewUsecase(expenseRepo, currencyUsecase)
	expenseHandler := expense.NewHandler(expenseUsecase)

	// Transportation domain (uses expenseUsecase for atomic linked-expense create)
	transportationRepo := transportation.NewPostgresRepository(db)
	transportationUsecase := transportation.NewUsecase(transportationRepo, expenseUsecase)
	transportationHandler := transportation.NewHandler(transportationUsecase)

	// Accommodation domain (same pattern)
	accommodationRepo := accommodation.NewPostgresRepository(db)
	accommodationUsecase := accommodation.NewUsecase(accommodationRepo, expenseUsecase)
	accommodationHandler := accommodation.NewHandler(accommodationUsecase)

	// ── LLM Client (provider-agnostic: DeepSeek or OpenRouter) ──
	// Replaces the old openrouter.Client. Provider is selected via LLM_PROVIDER
	// env var or config.yaml. Falls back to legacy OPENROUTER_* vars when unset.
	llmClient := llm.NewClient(
		cfg.EffectiveProvider(),
		cfg.ActiveAPIKey(),
		cfg.ActiveModel(),
		cfg.ActiveBaseURL(),
	).WithTimeout(time.Duration(cfg.LLM.TimeoutSeconds) * time.Second)

	summaryRepo := summary.NewPostgresRepository(db)
	tripContextProvider := integration.NewTripContextProvider(
		tripUsecase, activityUsecase, accommodationUsecase, transportationUsecase, expenseUsecase,
	)
	summaryUsecase := summary.NewUsecase(summaryRepo, llmClient, tripContextProvider, cfg.ActiveModel()).
		WithRateLimitWindow(time.Duration(cfg.LLM.SummaryRateLimitSeconds) * time.Second)

	summaryHandler := summary.NewHandler(summaryUsecase).
		WithSummaryRateLimit(rdb, cfg.LLM.SummaryRateLimitSeconds)

	// Auto-generate trip domain (F5). Reuses the LLM client and an
	// integration adapter that persists the approved draft via trip + activity.
	autogenCreator := integration.NewAutogenCreator(tripUsecase, activityUsecase)
	autogenUsecase := autogen.NewUsecase(llmClient, autogenCreator, cfg.ActiveModel())
	autogenHandler := autogen.NewHandler(autogenUsecase).
		WithGenerateRateLimit(rdb, cfg.LLM.GenerateRateLimitSeconds)

	// Echo
	e := echo.New()
	e.HideBanner = true

	// Phase 3D: structured request logging with slog + request ID.
	e.Use(echomw.RequestID())
	e.Use(echomw.RequestLoggerWithConfig(echomw.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      true,
		LogMethod:   true,
		LogLatency:  true,
		LogRemoteIP: true,
		LogValuesFunc: func(c echo.Context, v echomw.RequestLoggerValues) error {
			userID, _ := c.Get(appMiddleware.UserIDKey).(string)
			slog.Info("request",
				"request_id", v.RequestID,
				"method", v.Method,
				"uri", v.URI,
				"status", v.Status,
				"latency_ms", v.Latency.Milliseconds(),
				"remote_ip", v.RemoteIP,
				"user_id", userID,
			)
			return nil
		},
	}))
	e.Use(echomw.Recover())
	// Build CORS origins: always include the configured FRONTEND_URL.
	// In development, also allow any localhost port so the frontend can run
	// on port 3001/3002/etc when 3000 is occupied.
	corsOrigins := []string{cfg.App.FrontendURL}
	if strings.HasPrefix(cfg.App.FrontendURL, "http://localhost") {
		// Allow localhost on any port during local dev.
		corsOrigins = append(corsOrigins,
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:3002",
			"http://localhost:3003",
		)
	}
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		AllowHeaders:     []string{echo.HeaderContentType, echo.HeaderAuthorization, "X-CSRF-Token"},
		AllowCredentials: true,
	}))

	// Security headers on every API response (defense in depth — Next.js also
	// sets these for the frontend, but the API may be accessed directly).
	e.Use(appMiddleware.SecurityHeaders())

	// CSRF protection via Double Submit Cookie pattern (Loop 11).
	// Requires shared cookie domain in production (.navisha.cloud).
	e.Use(appMiddleware.CSRF(cfg.App.CookieDomain))

	// Per-request timeout (300s) to prevent hanging requests while allowing
	// slow LLM calls (summary/generate). Matches llm.timeout_seconds config.
	e.Use(appMiddleware.Timeout(300 * time.Second))

	// Loop 3: limit request body size to 1MB.
	e.Use(appMiddleware.BodyLimit(1 << 20))

	// Phase 3D: per-user rate limiting via Redis sliding window.
	// Uses JWT extraction to identify users even before auth middleware runs,
	// falling back to IP for unauthenticated requests.
	rateLimiter := appMiddleware.NewRateLimiter(rdb, jwtSvc, appMiddleware.RateLimitConfig{
		Enabled:       cfg.RateLimit.Enabled,
		AuthPerMinute: cfg.RateLimit.AuthPerMinute,
		LLMPerMinute:  cfg.RateLimit.LLMPerMinute,
		GeneralPerMin: cfg.RateLimit.GeneralPerMin,
	})

	// Loop 2: API version header on all responses.
	e.Use(appMiddleware.APIVersionHeader())

	// Health check — includes DB and Redis status (Loop 5: robustness)
	e.GET("/health", func(c echo.Context) error {
		healthy := true
		dbOk := db.Ping(c.Request().Context()) == nil
		redisOk := rdb.Ping(c.Request().Context()).Err() == nil
		if !dbOk || !redisOk {
			healthy = false
		}
		status := http.StatusOK
		if !healthy {
			status = http.StatusServiceUnavailable
		}
		return c.JSON(status, map[string]any{
			"status": map[bool]string{true: "ok", false: "degraded"}[healthy],
			"db":     map[bool]string{true: "ok", false: "error"}[dbOk],
			"redis":  map[bool]string{true: "ok", false: "error"}[redisOk],
		})
	})

	// Loop 17: security.txt — vulnerability disclosure policy (RFC 9116).
	e.GET("/.well-known/security.txt", func(c echo.Context) error {
		c.Response().Header().Set("Content-Type", "text/plain; charset=utf-8")
		return c.String(http.StatusOK,
			"Contact: mailto:security@navisha.cloud\n"+
				"Expires: 2027-12-31T23:59:59Z\n"+
				"Preferred-Languages: en\n"+
				"Canonical: https://navisha.cloud/.well-known/security.txt\n"+
				"Policy: https://navisha.cloud/privacy\n")
	})

	// Auth middleware
	authMiddleware := appMiddleware.Auth(jwtSvc)

	// API v1
	api := e.Group("/api/v1")

	// Rate limiter for all /api/v1 routes. Identifies users via JWT extraction
	// (unverified — for bucketing only) or falls back to IP for public routes.
	api.Use(rateLimiter.Limit())

	// Prevent browsers from caching API responses — critical for mutation-heavy
	// endpoints (reorder, CRUD) where stale cache causes "first reload old data".
	api.Use(appMiddleware.NoCache())

	userHandler.RegisterRoutes(api, authMiddleware)
	tripHandler.RegisterRoutes(api, authMiddleware)
	activityHandler.RegisterRoutes(api, authMiddleware)
	currencyHandler.RegisterRoutes(api, authMiddleware)
	expenseHandler.RegisterRoutes(api, authMiddleware)
	transportationHandler.RegisterRoutes(api, authMiddleware)
	accommodationHandler.RegisterRoutes(api, authMiddleware)
	summaryHandler.RegisterRoutes(api, authMiddleware)
	autogenHandler.RegisterRoutes(api, authMiddleware)

	// Graceful shutdown
	go func() {
		addr := fmt.Sprintf(":%d", cfg.Server.Port)
		// Loop 10: Configure server-level timeouts to protect against
		// slow-loris attacks and hung connections.
		e.Server.ReadTimeout = 15 * time.Second
		// WriteTimeout must exceed the LLM call timeout (300s) otherwise the
		// server cuts the TCP connection mid-stream on slow AI responses.
		// Add 10s headroom above the per-request middleware timeout.
		e.Server.WriteTimeout = 315 * time.Second
		e.Server.IdleTimeout = 120 * time.Second
		// Loop 49: limit header size to prevent buffer exhaustion (default 1MB is too generous).
		e.Server.MaxHeaderBytes = 1 << 18 // 256KB
		slog.Info("server starting", "addr", addr,
			"read_timeout", e.Server.ReadTimeout,
			"write_timeout", e.Server.WriteTimeout,
			"idle_timeout", e.Server.IdleTimeout,
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
