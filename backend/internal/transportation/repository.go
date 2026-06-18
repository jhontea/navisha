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
	FindTripOwner(tripID string) (userID string, err error)
	// Ownership: transportation → trip → user JOIN.
	FindTransportationOwner(id string) (userID, tripID string, err error)

	List(tripID string) ([]Transportation, error)
	FindByID(id string) (*Transportation, error)
	Insert(t *Transportation) (*Transportation, error)
	Update(t *Transportation) (*Transportation, error)
	Delete(id string) error

	// Transaction primitives — used when the usecase needs atomicity with
	// a linked expense insert (see ExpenseCreator).
	BeginTx(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context, tx pgx.Tx) error
	Rollback(ctx context.Context, tx pgx.Tx) error
	InsertTx(ctx context.Context, tx pgx.Tx, t *Transportation) (*Transportation, error)
}
