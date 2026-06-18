package expense

import (
	"context"
	"fmt"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/jackc/pgx/v5"
)

// Converter abstracts currency conversion. Defined here so the expense
// package does not import the currency package directly (cross-domain rule).
// currency.Usecase satisfies this interface.
type Converter interface {
	Convert(from, to string, amount float64) (converted float64, rate float64, err error)
}

type UsecaseInterface interface {
	List(userID, tripID string) ([]Expense, error)
	Create(userID, tripID string, in CreateInput) (*Expense, error)
	Update(userID, expenseID string, in UpdateInput) (*Expense, error)
	Delete(userID, expenseID string) error
	Summary(userID, tripID string) (*Summary, error)
}

// LinkedExpenseCreator is the cross-domain contract that transportation /
// accommodation use to attach an expense atomically with their own insert.
// CreateLinkedExpenseTx runs inside the caller's transaction so a failure
// rolls back both rows.
type LinkedExpenseCreator interface {
	CreateLinkedExpenseTx(
		ctx context.Context, tx pgx.Tx,
		userID, tripID, title, currency, category string, amount float64,
	) error
}

type CreateInput struct {
	Title      string
	Amount     float64
	Currency   string
	Category   Category
	ActivityID *string
}

type UpdateInput struct {
	Title      string
	Amount     float64
	Currency   string
	Category   Category
	ActivityID *string
}

type Usecase struct {
	repo      Repository
	converter Converter
}

func NewUsecase(repo Repository, converter Converter) *Usecase {
	return &Usecase{repo: repo, converter: converter}
}

var _ UsecaseInterface = (*Usecase)(nil)
var _ LinkedExpenseCreator = (*Usecase)(nil)

// CreateLinkedExpenseTx is called by transportation / accommodation usecases
// inside their transaction. We resolve the trip's base currency, run the
// non-DB currency conversion outside any locks, then insert via tx so the
// caller controls commit/rollback boundaries.
func (u *Usecase) CreateLinkedExpenseTx(
	ctx context.Context, tx pgx.Tx,
	userID, tripID, title, currency, category string, amount float64,
) error {
	owner, base, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	cat := Category(category)
	if err := validateInput(title, amount, currency, cat); err != nil {
		return err
	}

	converted, _, err := u.converter.Convert(currency, base, amount)
	if err != nil {
		return fmt.Errorf("expense.CreateLinkedExpenseTx convert: %w", err)
	}

	_, err = u.repo.CreateTx(ctx, tx, &Expense{
		TripID:          tripID,
		Title:           title,
		Amount:          amount,
		Currency:        currency,
		ConvertedAmount: converted,
		BaseCurrency:    base,
		Category:        cat,
	})
	return err
}

func (u *Usecase) List(userID, tripID string) ([]Expense, error) {
	owner, _, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(tripID)
}

func (u *Usecase) Create(userID, tripID string, in CreateInput) (*Expense, error) {
	owner, base, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validateInput(in.Title, in.Amount, in.Currency, in.Category); err != nil {
		return nil, err
	}

	converted, _, err := u.converter.Convert(in.Currency, base, in.Amount)
	if err != nil {
		return nil, fmt.Errorf("expense.Create convert: %w", err)
	}

	e := &Expense{
		TripID:          tripID,
		ActivityID:      in.ActivityID,
		Title:           in.Title,
		Amount:          in.Amount,
		Currency:        in.Currency,
		ConvertedAmount: converted,
		BaseCurrency:    base,
		Category:        in.Category,
	}
	return u.repo.Create(e)
}

func (u *Usecase) Update(userID, expenseID string, in UpdateInput) (*Expense, error) {
	owner, tripID, err := u.repo.FindExpenseOwner(expenseID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validateInput(in.Title, in.Amount, in.Currency, in.Category); err != nil {
		return nil, err
	}

	_, base, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	converted, _, err := u.converter.Convert(in.Currency, base, in.Amount)
	if err != nil {
		return nil, fmt.Errorf("expense.Update convert: %w", err)
	}

	existing, err := u.repo.FindByID(expenseID)
	if err != nil {
		return nil, err
	}
	existing.ActivityID = in.ActivityID
	existing.Title = in.Title
	existing.Amount = in.Amount
	existing.Currency = in.Currency
	existing.Category = in.Category
	existing.ConvertedAmount = converted
	existing.BaseCurrency = base

	return u.repo.Update(existing)
}

func (u *Usecase) Delete(userID, expenseID string) error {
	owner, _, err := u.repo.FindExpenseOwner(expenseID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(expenseID)
}

func (u *Usecase) Summary(userID, tripID string) (*Summary, error) {
	owner, base, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.Summary(tripID, base)
}

func validateInput(title string, amount float64, currency string, cat Category) error {
	if title == "" {
		return fmt.Errorf("title required")
	}
	if amount <= 0 {
		return fmt.Errorf("amount must be > 0")
	}
	if currency == "" {
		return ErrInvalidCurrency
	}
	if !cat.Valid() {
		return ErrInvalidCategory
	}
	return nil
}
