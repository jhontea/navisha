package integration

import (
	"context"
	"fmt"
	"log"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Global test context shared across all tests (sequential).
var globalCtx *TestContext
var globalCfg *SetupConfig

// TestMain is the entry point for all integration tests.
// It sets up the test environment, seeds data, runs tests, and cleans up.
func TestMain(m *testing.M) {
	// Load .env from backend root (tests/integration/ -> ../../.env)
	// This ensures JWT secrets, DB URL, and LLM keys are picked up.
	envPath := ""
	if _, err := os.Stat("../../.env"); err == nil {
		envPath = "../../.env"
	} else if _, err := os.Stat("../.env"); err == nil {
		envPath = "../.env"
	} else if _, err := os.Stat(".env"); err == nil {
		envPath = ".env"
	}
	if envPath != "" {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("WARNING: failed to load %s: %v", envPath, err)
		} else {
			log.Printf("loaded environment from %s", envPath)
		}
	} else {
		log.Println("WARNING: no .env file found (tests may use defaults)")
	}

	// Load configuration (reads from env vars so .env must be loaded first)
	globalCfg = LoadSetupConfig()

	// Create test context with JWT token
	globalCtx = NewTestContext(globalCfg)

	// Seed test user in database
	if err := seedUserDB(globalCfg); err != nil {
		log.Printf("WARNING: failed to seed test user (tests may fail for user-dependent endpoints): %v", err)
	}

	// Run tests
	code := m.Run()

	// Cleanup: remove test user
	if err := removeUserDB(globalCfg); err != nil {
		log.Printf("WARNING: failed to clean up test user: %v", err)
	}

	os.Exit(code)
}

// seedUserDB inserts the test user directly into the database.
// This is needed because some endpoints verify user existence via DB JOIN.
func seedUserDB(cfg *SetupConfig) error {
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to db: %w", err)
	}
	defer pool.Close()

	_, err = pool.Exec(context.Background(),
		`INSERT INTO users (id, google_id, email, name, avatar_url) 
		 VALUES ($1, $2, $3, $4, $5) 
		 ON CONFLICT (id) DO UPDATE SET google_id = $2, email = $3, name = $4, avatar_url = $5`,
		cfg.UserID, cfg.UserID, cfg.UserEmail, cfg.UserName, cfg.UserAvatarURL,
	)
	if err != nil {
		return fmt.Errorf("seed user: %w", err)
	}

	log.Printf("seeded test user: id=%s email=%s", cfg.UserID, cfg.UserEmail)
	return nil
}

// removeUserDB removes the test user from the database.
func removeUserDB(cfg *SetupConfig) error {
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to db: %w", err)
	}
	defer pool.Close()

	_, err = pool.Exec(context.Background(),
		`DELETE FROM users WHERE id = $1`,
		cfg.UserID,
	)
	if err != nil {
		return fmt.Errorf("remove user: %w", err)
	}

	log.Printf("removed test user: id=%s", cfg.UserID)
	return nil
}

// skipIfNoLLM skips the test if LLM API key is not configured.
func skipIfNoLLM(t *testing.T) {
	t.Helper()
	if os.Getenv("OPENROUTER_API_KEY") == "" && os.Getenv("DEEPSEEK_API_KEY") == "" && os.Getenv("LLM_API_KEY") == "" {
		t.Skip("Skipping AI test: no LLM API key configured")
	}
}
