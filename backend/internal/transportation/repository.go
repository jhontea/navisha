package transportation

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound     = errors.New("transportation not found")
	ErrTripNotFound = errors.New("trip not found")
	ErrInvalidType  = errors.New("invalid transportation type")
)

type Repository interface {
	// Ownership: trip → user JOIN.
	FindTripOwner(ctx context.Context, tripID string) (userID string, err error)
	// Ownership: transportation → trip → user JOIN.
	FindTransportationOwner(ctx context.Context, id string) (userID, tripID string, err error)

	List(ctx context.Context, tripID string) ([]Transportation, error)
	FindByID(ctx context.Context, id string) (*Transportation, error)
	Insert(ctx context.Context, t *Transportation) (*Transportation, error)
	Update(ctx context.Context, t *Transportation) (*Transportation, error)
	Delete(ctx context.Context, id string) error

	// Transaction primitives — used when the usecase needs atomicity with
	// a linked expense insert (see ExpenseCreator).
	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error
	InsertTx(ctx context.Context, tx pgx.Tx, t *Transportation) (*Transportation, error)
}
