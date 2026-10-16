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
	ErrInvalidDate     = errors.New("invalid expense_date (expect YYYY-MM-DD)")
)

type Repository interface {
	// FindTripOwner returns (user_id, base_currency) for the trip. Used for
	// ownership check and to know the conversion target on insert.
	FindTripOwner(ctx context.Context, tripID string) (userID, baseCurrency string, err error)
	// FindExpenseOwner returns (user_id, trip_id) via JOIN — used by Update/Delete.
	FindExpenseOwner(ctx context.Context, expenseID string) (userID, tripID string, err error)

	List(ctx context.Context, tripID string) ([]Expense, error)
	FindByID(ctx context.Context, id string) (*Expense, error)
	Create(ctx context.Context, e *Expense) (*Expense, error)
	// CreateTx inserts using an existing transaction. Called by cross-domain
	// usecases (transportation/accommodation) when they need atomicity with
	// their own entity insert.
	CreateTx(ctx context.Context, tx pgx.Tx, e *Expense) (*Expense, error)
	Update(ctx context.Context, e *Expense) (*Expense, error)
	// ListForRebaseTx returns the trip's expenses locked FOR UPDATE inside
	// tx, so a base-currency change can reconvert them atomically.
	ListForRebaseTx(ctx context.Context, tx pgx.Tx, tripID string) ([]Expense, error)
	// UpdateConvertedTx rewrites only converted_amount + base_currency.
	UpdateConvertedTx(ctx context.Context, tx pgx.Tx, id string, converted float64, base string) error
	Delete(ctx context.Context, id string) error
	// FindLinkedTx returns the expense linked to a booking (column is
	// "transportation_id" or "accommodation_id"), locked FOR UPDATE, or
	// ErrNotFound.
	FindLinkedTx(ctx context.Context, tx pgx.Tx, column, bookingID string) (*Expense, error)
	// UpdateCostTx rewrites only the amount, its currency and its conversion.
	UpdateCostTx(ctx context.Context, tx pgx.Tx, id string, amount float64, currency string, converted float64, base string) error
	DeleteTx(ctx context.Context, tx pgx.Tx, id string) error
	Summary(ctx context.Context, tripID, baseCurrency string) (*Summary, error)
}
