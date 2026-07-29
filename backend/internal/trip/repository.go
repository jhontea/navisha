package trip

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound              = errors.New("trip not found")
	ErrInvalidDates          = errors.New("invalid trip dates")
	ErrInvalidCurrency       = errors.New("invalid base currency")
	ErrInvalidCursor         = errors.New("invalid cursor")
	ErrEmptyTitle            = errors.New("title must not be empty")
	ErrTitleTooLong          = errors.New("title exceeds maximum length")
	ErrDescriptionTooLong    = errors.New("description exceeds maximum length")
	ErrNotesTooLong          = errors.New("notes exceed maximum length")
	ErrURLTooLong            = errors.New("cover image url exceeds maximum length")
	ErrTripTooLong           = errors.New("trip duration exceeds maximum (90 days)")
	ErrInvalidBudget         = errors.New("budget must not be negative")
	ErrInvalidBudgetCategory = errors.New("invalid budget category")
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

	List(ctx context.Context, userID, cursor string, limit int) (ListResult, error)
	// ListFiltered returns trips with optional date-range filter + cursor pagination.
	ListFiltered(ctx context.Context, userID, cursor string, limit int, from, to string) (ListResult, error)
	// ListUpcoming returns trips whose end_date >= today, ordered by start_date ASC.
	ListUpcoming(ctx context.Context, userID string, limit int) ([]Trip, error)
	FindByID(ctx context.Context, id string) (*Trip, error)
	InsertTrip(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error)
	InsertDays(ctx context.Context, tx pgx.Tx, days []Day) error
	DeleteDays(ctx context.Context, tx pgx.Tx, tripID string) error
	Update(ctx context.Context, t *Trip) (*Trip, error)
	// UpdateTx updates a trip row within an existing transaction (Phase 3D / Iter 8).
	UpdateTx(ctx context.Context, tx pgx.Tx, t *Trip) (*Trip, error)
	Delete(ctx context.Context, id string) error

	ListDays(ctx context.Context, tripID string) ([]Day, error)
	FindDayOwner(ctx context.Context, dayID string) (userID string, err error)
	UpdateDayTitle(ctx context.Context, dayID, title string) (*Day, error)
	UpdateDayNotes(ctx context.Context, dayID, notes string) (*Day, error)
}

var ErrDayNotFound = errors.New("day not found")
var ErrDayTitleTooLong = errors.New("day title exceeds maximum length")
