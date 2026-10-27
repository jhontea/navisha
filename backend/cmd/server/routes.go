package main

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jhontea/navisha/backend/config"
	appMiddleware "github.com/jhontea/navisha/backend/internal/middleware"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/redis/go-redis/v9"
)

// newServer builds the Echo instance: global middleware, health and
// security.txt, and every /api/v1 route.
func newServer(cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client, a *app) *echo.Echo {
	// Echo
	e := echo.New()
	e.HideBanner = true
	if cfg.Server.TrustProxy {
		// The first untrusted X-Forwarded-For hop is treated as the client.
		e.IPExtractor = echo.ExtractIPFromXFFHeader()
	} else {
		e.IPExtractor = echo.ExtractIPDirect()
	}

	// Phase 3D: structured request logging with slog + request ID.
	e.Use(echomw.RequestID())
	e.Use(echomw.RequestLoggerWithConfig(echomw.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      false,
		LogMethod:   true,
		LogLatency:  true,
		LogRemoteIP: true,
		LogValuesFunc: func(c echo.Context, v echomw.RequestLoggerValues) error {
			userID, _ := c.Get(appMiddleware.UserIDKey).(string)
			route := c.Path()
			if route == "" {
				route = "unmatched"
			}
			slog.Info("request",
				"request_id", v.RequestID,
				"method", v.Method,
				"route", route,
				"status", v.Status,
				"latency_ms", v.Latency.Milliseconds(),
				"remote_ip", v.RemoteIP,
				"user_id", userID,
			)
			return nil
		},
	}))
	e.Use(echomw.Recover())
	if cfg.App.SentryDSN != "" {
		useSentry(e)
	}
	// Compress JSON responses to reduce transfer time on mobile networks.
	// Small responses stay uncompressed to avoid CPU/header overhead.
	e.Use(echomw.GzipWithConfig(echomw.GzipConfig{
		Level:     5,
		MinLength: 1024,
	}))
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
		// Mutations require a CSRF header and therefore a CORS preflight. Cache
		// that result so repeated edits do not pay another network round trip.
		MaxAge: 86400,
	}))

	// Security headers on every API response (defense in depth — Next.js also
	// sets these for the frontend, but the API may be accessed directly).
	e.Use(appMiddleware.SecurityHeaders())

	// CSRF protection via Double Submit Cookie pattern (Loop 11).
	// Requires shared cookie domain in production (.navisha.cloud).
	e.Use(appMiddleware.CSRF(cfg.App.CookieDomain))

	// Per-request timeout: 30s for regular requests so a stuck CRUD call does
	// not hold a DB connection for minutes; LLM routes get the full LLM
	// timeout (llm.timeout_seconds). Keep this list in sync with the
	// summary/autogen/bookingparse handlers' RegisterRoutes.
	longTimeout := llmTimeout(cfg)
	// Routes that wait for the LLM inside the request (long timeout + LLM rate bucket).
	llmRoutes := []string{
		"POST /api/v1/trips/:id/summary",
		"POST /api/v1/trips/generate",
		"POST /api/v1/trips/from-draft",
		"POST /api/v1/trips/:trip_id/days/:day_id/generate-preview",
		"POST /api/v1/trips/:id/bookings/parse",
	}
	llmTimeouts := make(map[string]time.Duration, len(llmRoutes))
	for _, route := range llmRoutes {
		llmTimeouts[route] = longTimeout
	}
	// Starting a generation job answers 202 at once, so it only needs the LLM
	// rate bucket. The job GETs are cheap polling and stay in the general one.
	llmRateRoutes := append(append([]string{}, llmRoutes...), "POST /api/v1/trips/generate/jobs")
	e.Use(appMiddleware.Timeout(30*time.Second, llmTimeouts))

	// Loop 3: limit request body size to 1MB.
	const maxBodySize = 1 << 20 // 1MB
	e.Use(appMiddleware.BodyLimit(maxBodySize))

	// Phase 3D: per-user rate limiting via Redis sliding window.
	// Validates JWTs to identify users even before auth middleware runs,
	// falling back to IP for unauthenticated requests.
	rateLimiter := appMiddleware.NewRateLimiter(rdb, a.jwtSvc, appMiddleware.RateLimitConfig{
		Enabled:       cfg.RateLimit.Enabled,
		AuthPerMinute: cfg.RateLimit.AuthPerMinute,
		LLMPerMinute:  cfg.RateLimit.LLMPerMinute,
		GeneralPerMin: cfg.RateLimit.GeneralPerMin,
		LLMRoutes:     llmRateRoutes,
	})

	// Loop 2: API version header on all responses.
	e.Use(appMiddleware.APIVersionHeader())

	// Health check — DB and Redis status (Loop 5: robustness).
	e.GET("/health", func(c echo.Context) error {
		dbOk := db.Ping(c.Request().Context()) == nil
		redisOk := rdb.Ping(c.Request().Context()).Err() == nil
		healthy := dbOk && redisOk
		status := http.StatusOK
		if !healthy {
			status = http.StatusServiceUnavailable
		}
		return c.JSON(status, map[string]string{
			"status": map[bool]string{true: "ok", false: "degraded"}[healthy],
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
	authMiddleware := appMiddleware.Auth(a.jwtSvc)

	// API v1
	api := e.Group("/api/v1")

	// Rate limiter for all /api/v1 routes. Identifies users via JWT extraction
	// (unverified — for bucketing only) or falls back to IP for public routes.
	api.Use(rateLimiter.Limit())

	// Prevent browsers from caching API responses — critical for mutation-heavy
	// endpoints (reorder, CRUD) where stale cache causes "first reload old data".
	api.Use(appMiddleware.NoCache())

	a.userHandler.RegisterRoutes(api, authMiddleware)
	if cfg.App.Environment == "test" && cfg.App.E2EAuth {
		slog.Warn("E2E_AUTH is on: POST /api/v1/auth/test-login signs in test users without Google")
		a.userHandler.RegisterTestLogin(api, a.userUsecase)
	}
	a.tripHandler.RegisterRoutes(api, authMiddleware)
	a.tripShareHandler.RegisterRoutes(api, authMiddleware)
	a.activityHandler.RegisterRoutes(api, authMiddleware)
	a.tripActivitiesHandler.RegisterRoutes(api, authMiddleware)
	a.tripOverviewHandler.RegisterRoutes(api, authMiddleware)
	a.dashboardHandler.RegisterRoutes(api, authMiddleware)
	a.tripDuplicateHandler.RegisterRoutes(api, authMiddleware)
	a.tripWeatherHandler.RegisterRoutes(api, authMiddleware)
	a.locationHandler.RegisterRoutes(api, authMiddleware)
	a.currencyHandler.RegisterRoutes(api, authMiddleware)
	a.expenseHandler.RegisterRoutes(api, authMiddleware)
	a.transportationHandler.RegisterRoutes(api, authMiddleware)
	a.accommodationHandler.RegisterRoutes(api, authMiddleware)
	a.summaryHandler.RegisterRoutes(api, authMiddleware)
	a.autogenHandler.RegisterRoutes(api, authMiddleware)
	a.bookingParseHandler.RegisterRoutes(api, authMiddleware)

	return e
}

// llmTimeout is how long one LLM-backed request (or background job) may run.
func llmTimeout(cfg *config.Config) time.Duration {
	if d := time.Duration(cfg.LLM.TimeoutSeconds) * time.Second; d > 0 {
		return d
	}
	return 300 * time.Second
}
