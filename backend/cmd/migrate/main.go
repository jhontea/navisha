// Command migrate runs database migrations independently of the server.
// Usage:
//
//	go run ./cmd/migrate              # apply pending migrations
//	go run ./cmd/migrate -status      # show pending migrations
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/ahmadhafizh/navisha/backend/config"
	"github.com/ahmadhafizh/navisha/backend/internal/migrate"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	statusOnly := flag.Bool("status", false, "show pending migrations without applying")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	db, err := pgxpool.New(context.Background(), cfg.DB.URL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(context.Background()); err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}

	runner := migrate.New(db, "migrations")

	if *statusOnly {
		pending, err := runner.Status(context.Background())
		if err != nil {
			slog.Error("failed to check migrations", "error", err)
			os.Exit(1)
		}
		if len(pending) == 0 {
			fmt.Println("All migrations applied.")
		} else {
			fmt.Printf("%d pending migration(s):\n", len(pending))
			for _, name := range pending {
				fmt.Printf("  - %s\n", name)
			}
		}
		return
	}

	n, err := runner.Run(context.Background())
	if err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	if n == 0 {
		fmt.Println("All migrations already applied — nothing to do.")
	} else {
		fmt.Printf("Successfully applied %d migration(s).\n", n)
	}
}
