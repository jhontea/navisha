package trip

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound        = errors.New("trip not found")
	ErrInvalidDates    = errors.New("invalid trip dates")
	ErrInvalidCurrency = errors.New("invalid base currency")
	ErrInvalidCursor   = errors.New("invalid cursor")
)

// ListResult carries a page of trips plus the cursor for the next page.
// NextCursor is empty when no further pages exist.
type ListResult struct {
	Trips      []Trip
	NextCursor string
}

type Repository interface {
	// Transaction control. Usecase orchestrates: BeginTx → InsertTrip/InsertDays
	// → Commit (or Rollback on error). All DB interaction goes through the repo.
	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error

	List(userID, cursor string, limit int) (ListResult, error)
	// ListFiltered returns trips with optional date-range filter + cursor pagination.
	ListFiltered(userID, cursor string, limit int, from, to string) (ListResult, error)
	// ListUpcoming returns trips whose end_date >= today, ordered by start_date ASC.
	ListUpcoming(userID string, limit int) ([]Trip, error)
	FindByID(id string) (*Trip, error)
	InsertTrip(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error)
	InsertDays(ctx context.Context, tx pgx.Tx, days []Day) error
	DeleteDays(ctx context.Context, tx pgx.Tx, tripID string) error
	Update(t *Trip) (*Trip, error)
	// UpdateTx updates a trip row within an existing transaction (Phase 3D / Iter 8).
	UpdateTx(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error)
	Delete(id string) error

	ListDays(tripID string) ([]Day, error)
	FindDayOwner(dayID string) (userID string, err error)
	UpdateDayNotes(dayID, notes string) (*Day, error)
}

var ErrDayNotFound = errors.New("day not found")
