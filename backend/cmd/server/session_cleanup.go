package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/jhontea/navisha/backend/internal/user"
)

// runSessionCleanup deletes old refresh sessions at startup and then daily,
// until ctx is cancelled (on shutdown).
func runSessionCleanup(ctx context.Context, u *user.Usecase) {
	run := func() {
		runCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		deleted, err := u.CleanupRefreshSessions(runCtx)
		if err != nil {
			if ctx.Err() == nil {
				slog.Error("refresh session cleanup failed", "error", err)
			}
			return
		}
		slog.Info("refresh session cleanup", "deleted", deleted)
	}

	run()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}
