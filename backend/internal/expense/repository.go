package expense

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound        = errors.New("expense not found")
	ErrTripNotFound    = errors.New("trip not found")
	ErrInvalidCategory = errors.New("invalid category")
	ErrInvalidCurrency = errors.New("invalid currency")
)

type Repository interface {
	// FindTripOwner returns (user_id, base_currency) for the trip. Used for
	// ownership check and to know the conversion target on insert.
	FindTripOwner(tripID string) (userID, baseCurrency string, err error)
	// FindExpenseOwner returns (user_id, trip_id) via JOIN — used by Update/Delete.
	FindExpenseOwner(expenseID string) (userID, tripID string, err error)

	List(tripID string) ([]Expense, error)
	FindByID(id string) (*Expense, error)
	Create(e *Expense) (*Expense, error)
	// CreateTx inserts using an existing transaction. Called by cross-domain
	// usecases (transportation/accommodation) when they need atomicity with
	// their own entity insert.
	CreateTx(ctx context.Context, tx pgx.Tx, e *Expense) (*Expense, error)
	Update(e *Expense) (*Expense, error)
	Delete(id string) error
	Summary(tripID, baseCurrency string) (*Summary, error)
}
