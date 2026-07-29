package activity

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound        = errors.New("activity not found")
	ErrDayNotFound     = errors.New("day not found")
	ErrInvalidType     = errors.New("invalid activity type")
	ErrInvalidPayload  = errors.New("invalid activity payload")
	ErrReorderMismatch = errors.New("reorder list does not match day activities")
)

type Repository interface {
	// Transaction control (reorder runs N updates atomically).
	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error

	// Ownership: returns user_id that owns the day's parent trip, or ErrDayNotFound.
	FindDayOwner(ctx context.Context, dayID string) (userID string, err error)
	// FindActivityOwner returns (userID, dayID) for the activity's parent chain.
	FindActivityOwner(ctx context.Context, activityID string) (userID, dayID string, err error)

	ListByDay(ctx context.Context, dayID string) ([]Activity, error)
	// ListByDayIDs fetches activities for multiple days in a single query (Phase 3D: N+1 fix).
	ListByDayIDs(ctx context.Context, dayIDs []string) (map[string][]Activity, error)
	FindByID(ctx context.Context, id string) (*Activity, error)
	Insert(ctx context.Context, a *Activity) (*Activity, error)
	CountOwnedDaysTx(ctx context.Context, tx pgx.Tx, userID string, dayIDs []string) (int, error)
	BatchInsertTx(ctx context.Context, tx pgx.Tx, activities []Activity) error
	Update(ctx context.Context, a *Activity) (*Activity, error)
	Delete(ctx context.Context, id string) error

	// UpdateOrderTx runs in a tx so reorder is atomic.
	UpdateOrderTx(ctx context.Context, tx pgx.Tx, activityID string, orderIndex int) error
	// BatchUpdateOrderTx updates all order indexes in a single statement (Phase 3D).
	BatchUpdateOrderTx(ctx context.Context, tx pgx.Tx, orderMap map[string]int) error
	ListIDsByDay(ctx context.Context, dayID string) ([]string, error)
}
