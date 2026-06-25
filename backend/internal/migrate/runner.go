// Package migrate provides a simple migration runner that reads SQL files
// and applies them in order, tracking applied migrations in a schema_migrations
// table. Supports CLI usage and programmatic invocation from server startup.
package migrate

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Runner manages database migrations.
type Runner struct {
	db  *pgxpool.Pool
	dir string
}

// New creates a migration runner. dir is the path to the migrations directory.
func New(db *pgxpool.Pool, dir string) *Runner {
	return &Runner{db: db, dir: dir}
}

// Run applies all pending migrations in order. Returns the number applied.
func (r *Runner) Run(ctx context.Context) (int, error) {
	if err := r.ensureTable(ctx); err != nil {
		return 0, fmt.Errorf("migrate: ensure schema_migrations table: %w", err)
	}

	files, err := r.pendingFiles(ctx)
	if err != nil {
		return 0, err
	}

	if len(files) == 0 {
		slog.Info("migrate: no pending migrations")
		return 0, nil
	}

	applied := 0
	for _, f := range files {
		slog.Info("migrate: applying", "file", f.name)
		sql, err := os.ReadFile(f.path)
		if err != nil {
			return applied, fmt.Errorf("migrate: read %s: %w", f.name, err)
		}

		tx, err := r.db.Begin(ctx)
		if err != nil {
			return applied, fmt.Errorf("migrate: begin tx for %s: %w", f.name, err)
		}
		defer tx.Rollback(ctx) //nolint:errcheck

		if _, err := tx.Exec(ctx, string(sql)); err != nil {
			return applied, fmt.Errorf("migrate: execute %s: %w", f.name, err)
		}

		if _, err := tx.Exec(ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1)`, f.name,
		); err != nil {
			return applied, fmt.Errorf("migrate: track %s: %w", f.name, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return applied, fmt.Errorf("migrate: commit %s: %w", f.name, err)
		}

		applied++
		slog.Info("migrate: applied", "file", f.name)
	}

	return applied, nil
}

type migrationFile struct {
	name string
	path string
}

func (r *Runner) ensureTable(ctx context.Context) error {
	_, err := r.db.Exec(ctx,
		`CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`)
	return err
}

func (r *Runner) pendingFiles(ctx context.Context) ([]migrationFile, error) {
	entries, err := os.ReadDir(r.dir)
	if err != nil {
		return nil, fmt.Errorf("migrate: read dir %s: %w", r.dir, err)
	}

	var sqlFiles []migrationFile
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		sqlFiles = append(sqlFiles, migrationFile{
			name: e.Name(),
			path: filepath.Join(r.dir, e.Name()),
		})
	}
	sort.Slice(sqlFiles, func(i, j int) bool {
		return sqlFiles[i].name < sqlFiles[j].name
	})

	// Query already-applied migrations.
	rows, err := r.db.Query(ctx,
		`SELECT filename FROM schema_migrations`)
	if err != nil {
		// Table might not exist yet — that's fine, return all files.
		return sqlFiles, nil
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("migrate: scan applied: %w", err)
		}
		applied[name] = true
	}

	var pending []migrationFile
	for _, f := range sqlFiles {
		if !applied[f.name] {
			pending = append(pending, f)
		}
	}
	return pending, nil
}

// Status returns the list of pending migration filenames.
func (r *Runner) Status(ctx context.Context) ([]string, error) {
	files, err := r.pendingFiles(ctx)
	if err != nil {
		return nil, err
	}
	names := make([]string, len(files))
	for i, f := range files {
		names[i] = f.name
	}
	return names, nil
}
