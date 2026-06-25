package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"

	"github.com/ahmadhafizh/navisha/backend/internal/currency"

	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/integration"
	appMiddleware "github.com/ahmadhafizh/navisha/backend/internal/middleware"
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
	"github.com/labstack/echo/v4/middleware"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Database
	db, err := pgxpool.New(context.Background(), cfg.DB.URL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(context.Background()); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}
	log.Println("database connected")

	// Redis
	redisOpts, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		log.Fatalf("failed to parse redis url: %v", err)
	}
	rdb := redis.NewClient(redisOpts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("failed to ping redis: %v", err)
	}
	log.Println("redis connected")
	defer rdb.Close()

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

	summaryHandler := summary.NewHandler(summaryUsecase)

	// Auto-generate trip domain (F5). Reuses the LLM client and an
	// integration adapter that persists the approved draft via trip + activity.
	autogenCreator := integration.NewAutogenCreator(tripUsecase, activityUsecase)
	autogenUsecase := autogen.NewUsecase(llmClient, autogenCreator, cfg.ActiveModel())
	autogenHandler := autogen.NewHandler(autogenUsecase)

	// Echo
	e := echo.New()
	e.HideBanner = true

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{cfg.App.FrontendURL},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		AllowHeaders:     []string{echo.HeaderContentType, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// Auth middleware
	authMiddleware := appMiddleware.Auth(jwtSvc)

	// API v1
	api := e.Group("/api/v1")
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
		log.Printf("server starting on %s", addr)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
	log.Println("server stopped")
}
