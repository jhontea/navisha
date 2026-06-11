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
	FindDayOwner(dayID string) (userID string, err error)
	// FindActivityOwner returns (userID, dayID) for the activity's parent chain.
	FindActivityOwner(activityID string) (userID, dayID string, err error)

	ListByDay(dayID string) ([]Activity, error)
	FindByID(id string) (*Activity, error)
	Insert(a *Activity) (*Activity, error)
	Update(a *Activity) (*Activity, error)
	Delete(id string) error

	// UpdateOrderTx runs in a tx so reorder is atomic.
	UpdateOrderTx(ctx context.Context, tx pgx.Tx, activityID string, orderIndex int) error
	ListIDsByDay(dayID string) ([]string, error)
}
