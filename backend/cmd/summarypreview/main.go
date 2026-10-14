// Command summarypreview prints the AI trip summary for one trip without
// saving it, to iterate on the summary prompt.
//
//	go run ./cmd/summarypreview -trip <trip-id>               # call the LLM, print markdown
//	go run ./cmd/summarypreview -trip <trip-id> -prompt-only  # print the prompts only
//
// It only reads the database (the same trip snapshot the server builds), never
// writes the summary and never runs migrations. Each run without -prompt-only
// is one LLM call billed to the configured provider; it does not use the
// in-app daily AI quota.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/accommodation"
	"github.com/ahmadhafizh/navisha/backend/internal/activity"
	"github.com/ahmadhafizh/navisha/backend/internal/currency"
	"github.com/ahmadhafizh/navisha/backend/internal/expense"
	"github.com/ahmadhafizh/navisha/backend/internal/integration"
	"github.com/ahmadhafizh/navisha/backend/internal/summary"
	"github.com/ahmadhafizh/navisha/backend/internal/transportation"
	"github.com/ahmadhafizh/navisha/backend/internal/trip"
	pkgcurrency "github.com/ahmadhafizh/navisha/backend/pkg/currency"
	"github.com/ahmadhafizh/navisha/backend/pkg/llm"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	tripID := flag.String("trip", "", "trip ID to summarize")
	promptOnly := flag.Bool("prompt-only", false, "print the prompts without calling the LLM")
	langFlag := flag.String("lang", "id", "summary language: id or en")
	flag.Parse()
	if *tripID == "" {
		fail(fmt.Errorf("-trip is required"))
	}

	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.LLM.TimeoutSeconds+30)*time.Second)
	defer cancel()

	db, err := pgxpool.New(ctx, cfg.DB.URL)
	if err != nil {
		fail(err)
	}
	defer db.Close()
	redisOpts, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		fail(fmt.Errorf("invalid redis url"))
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	var userID string
	if err := db.QueryRow(ctx, `SELECT user_id FROM trips WHERE id = $1`, *tripID).Scan(&userID); err != nil {
		fail(fmt.Errorf("trip lookup: %w", err))
	}

	// Same wiring as cmd/server for the read path of the summary.
	currencyUsecase := currency.NewUsecase(currency.NewRedisRepository(rdb, pkgcurrency.NewClient(cfg.Currency.APIKey), cfg.Currency.CacheTTL))
	expenseUsecase := expense.NewUsecase(expense.NewPostgresRepository(db), currencyUsecase)
	provider := integration.NewTripContextProvider(
		trip.NewUsecase(trip.NewPostgresRepository(db), expenseUsecase),
		activity.NewUsecase(activity.NewPostgresRepository(db)),
		accommodation.NewUsecase(accommodation.NewPostgresRepository(db), expenseUsecase),
		transportation.NewUsecase(transportation.NewPostgresRepository(db), expenseUsecase),
		expenseUsecase,
	)

	tripCtx, err := provider.GetTripContext(ctx, userID, *tripID)
	if err != nil {
		fail(err)
	}
	lang, ok := summary.ParseLanguage(*langFlag)
	if !ok {
		fmt.Fprintln(os.Stderr, "-lang must be id or en")
		os.Exit(2)
	}
	tripCtx.Language = lang
	system, user := summary.BuildPrompt(*tripCtx)
	if *promptOnly {
		fmt.Printf("===== SYSTEM =====\n%s\n\n===== USER =====\n%s\n", system, user)
		return
	}

	client := llm.NewClient(cfg.EffectiveProvider(), cfg.ActiveAPIKey(), cfg.ActiveModel(), cfg.ActiveBaseURL()).
		WithTimeout(time.Duration(cfg.LLM.TimeoutSeconds) * time.Second)
	temp := summary.TemperatureForTrip(tripCtx.TripID)
	content, err := client.ChatCompletion(ctx, llm.ChatRequest{
		Model:       cfg.ActiveModel(),
		Temperature: &temp,
		Messages: []llm.Message{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
	})
	if err != nil {
		fail(err)
	}
	fmt.Println(content)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "summarypreview:", err)
	os.Exit(1)
}
