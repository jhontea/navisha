package accommodation

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound     = errors.New("accommodation not found")
	ErrTripNotFound = errors.New("trip not found")
	ErrInvalidDates = errors.New("invalid accommodation dates")
	ErrInvalidName  = errors.New("name required")
	ErrInvalidType  = errors.New("invalid accommodation type")
)

type Repository interface {
	FindTripOwner(ctx context.Context, tripID string) (userID string, err error)
	FindAccommodationOwner(ctx context.Context, id string) (userID, tripID string, err error)

	List(ctx context.Context, tripID string) ([]Accommodation, error)
	FindByID(ctx context.Context, id string) (*Accommodation, error)
	Insert(ctx context.Context, a *Accommodation) (*Accommodation, error)
	Update(ctx context.Context, a *Accommodation) (*Accommodation, error)
	Delete(ctx context.Context, id string) error

	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error
	InsertTx(ctx context.Context, tx pgx.Tx, a *Accommodation) (*Accommodation, error)
}
