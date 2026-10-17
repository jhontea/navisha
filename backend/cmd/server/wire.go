package main

import (
	"log/slog"
	"time"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/autogen"
	"github.com/ahmadhafizh/navisha/backend/internal/currency"
	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/integration"
	"github.com/ahmadhafizh/navisha/backend/internal/location"
	"github.com/ahmadhafizh/navisha/backend/internal/quota"
	"github.com/ahmadhafizh/navisha/backend/internal/summary"
	"github.com/ahmadhafizh/navisha/backend/internal/transportation"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	"github.com/ahmadhafizh/navisha/backend/internal/tripshare"
	"github.com/ahmadhafizh/navisha/backend/internal/user"
	pkgcurrency "github.com/ahmadhafizh/navisha/backend/pkg/currency"
	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
	"github.com/ahmadhafizh/navisha/backend/pkg/oauth"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// app holds what the HTTP layer needs from the wired domains.
type app struct {
	jwtSvc                *jwt.Service
	userUsecase           *user.Usecase
	userHandler           *user.Handler
	tripHandler           *trip.Handler
	tripShareHandler      *tripshare.Handler
	activityHandler       *activity.Handler
	tripActivitiesHandler *integration.TripActivitiesHandler
	tripOverviewHandler   *integration.TripOverviewHandler
	dashboardHandler      *integration.DashboardHandler
	locationHandler       *location.Handler
	currencyHandler       *currency.Handler
	expenseHandler        *expense.Handler
	transportationHandler *transportation.Handler
	accommodationHandler  *accommodation.Handler
	summaryHandler        *summary.Handler
	autogenHandler        *autogen.Handler
}

// wire builds every domain (repository → usecase → handler) and the shared
// services. Domains depend on each other only through the small interfaces
// they declare; this is the one place that knows the concrete types.
func wire(cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client) *app {
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

	// Currency domain
	currencyClient := pkgcurrency.NewClient(cfg.Currency.APIKey)
	currencyRepo := currency.NewRedisRepository(rdb, currencyClient, cfg.Currency.CacheTTL)
	currencyUsecase := currency.NewUsecase(currencyRepo)
	currencyHandler := currency.NewHandler(currencyUsecase)

	// Expense domain (depends on currency.Usecase via Converter interface)
	expenseRepo := expense.NewPostgresRepository(db)
	expenseUsecase := expense.NewUsecase(expenseRepo, currencyUsecase)
	expenseHandler := expense.NewHandler(expenseUsecase)

	// Trip domain (expenseUsecase reconverts expenses when base currency changes)
	tripRepo := trip.NewPostgresRepository(db)
	tripUsecase := trip.NewUsecase(tripRepo, expenseUsecase)
	tripHandler := trip.NewHandler(tripUsecase)
	shareSecret := cfg.App.ShareLinkSecret
	if shareSecret == "" {
		shareSecret = cfg.JWT.Secret
		slog.Warn("SHARE_LINK_SECRET is not set; using JWT_SECRET fallback")
	}
	tripShareRepo := tripshare.NewPostgresRepository(db)
	tripShareUsecase := tripshare.NewUsecase(tripShareRepo, shareSecret)
	tripShareHandler := tripshare.NewHandler(tripShareUsecase)

	// Activity domain
	activityRepo := activity.NewPostgresRepository(db)
	activityUsecase := activity.NewUsecase(activityRepo)
	activityHandler := activity.NewHandler(activityUsecase)
	tripActivitiesHandler := integration.NewTripActivitiesHandler(tripUsecase, activityUsecase)

	// Location autocomplete (Geoapify key remains server-side).
	locationClient := location.NewGeoapifyClient(
		cfg.Location.GeoapifyAPIKey,
		cfg.Location.GeoapifyBaseURL,
		time.Duration(cfg.Location.GeoapifyTimeoutSecs)*time.Second,
	)
	locationHandler := location.NewHandler(locationClient)

	// Transportation domain (uses expenseUsecase for atomic linked-expense create)
	transportationRepo := transportation.NewPostgresRepository(db)
	transportationUsecase := transportation.NewUsecase(transportationRepo, expenseUsecase)
	transportationHandler := transportation.NewHandler(transportationUsecase)

	// Accommodation domain (same pattern)
	accommodationRepo := accommodation.NewPostgresRepository(db)
	accommodationUsecase := accommodation.NewUsecase(accommodationRepo, expenseUsecase)
	accommodationHandler := accommodation.NewHandler(accommodationUsecase)
	tripOverviewReader := integration.NewPostgresTripOverviewReader(db)
	tripOverviewHandler := integration.NewTripOverviewHandler(tripUsecase, tripOverviewReader)
	dashboardHandler := integration.NewDashboardHandler(tripUsecase)

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
	summaryUsecase := summary.NewUsecase(summaryRepo, llmClient, tripContextProvider, cfg.ActiveModel())

	// Shared daily AI quota — all AI features (generate, build-around, summary)
	// share one Redis counter per user per UTC day. Limit is read from
	// app_settings.autogen_daily_quota in the database.
	aiQuota := quota.NewChecker(rdb, db)

	summaryHandler := summary.NewHandler(summaryUsecase).
		WithQuota(aiQuota)

	// Auto-generate trip domain (F5). Reuses the LLM client and an
	// integration adapter that persists the approved draft via trip + activity.
	autogenCreator := integration.NewAutogenCreator(tripUsecase, activityUsecase, transportationUsecase, accommodationUsecase)
	autogenDayContext := integration.NewAutogenDayContextProvider(tripUsecase, activityUsecase)
	autogenUsecase := autogen.NewUsecase(llmClient, autogenCreator, cfg.ActiveModel()).
		WithDayContextProvider(autogenDayContext)
	autogenHandler := autogen.NewHandler(autogenUsecase).
		WithQuota(aiQuota)

	return &app{
		jwtSvc:                jwtSvc,
		userUsecase:           userUsecase,
		userHandler:           userHandler,
		tripHandler:           tripHandler,
		tripShareHandler:      tripShareHandler,
		activityHandler:       activityHandler,
		tripActivitiesHandler: tripActivitiesHandler,
		tripOverviewHandler:   tripOverviewHandler,
		dashboardHandler:      dashboardHandler,
		locationHandler:       locationHandler,
		currencyHandler:       currencyHandler,
		expenseHandler:        expenseHandler,
		transportationHandler: transportationHandler,
		accommodationHandler:  accommodationHandler,
		summaryHandler:        summaryHandler,
		autogenHandler:        autogenHandler,
	}
}
