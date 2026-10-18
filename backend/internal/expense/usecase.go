package expense

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jhontea/navisha/backend/internal/apperr"
)

// Converter abstracts currency conversion. Defined here so the expense
// package does not import the currency package directly (cross-domain rule).
// currency.Usecase satisfies this interface.
type Converter interface {
	Convert(ctx context.Context, from, to string, amount float64) (converted float64, rate float64, err error)
}

type UsecaseInterface interface {
	List(ctx context.Context, userID, tripID string) ([]Expense, error)
	Create(ctx context.Context, userID, tripID string, in CreateInput) (*Expense, error)
	Update(ctx context.Context, userID, expenseID string, in UpdateInput) (*Expense, error)
	Delete(ctx context.Context, userID, expenseID string) error
	Summary(ctx context.Context, userID, tripID string) (*Summary, error)
}

// LinkedExpenseCreator is the cross-domain contract that transportation /
// accommodation usecases call for a booking's Cost field. It runs inside the
// caller's transaction so the booking and its cost commit together.
type LinkedExpenseCreator interface {
	SyncLinkedExpenseTx(
		ctx context.Context, tx pgx.Tx,
		userID, tripID, linkKind, bookingID, title, currency, category string,
		amount float64, expenseDate string,
	) error
}

// Booking kinds an expense can be linked to (SyncLinkedExpenseTx linkKind).
const (
	LinkTransportation = "transportation"
	LinkAccommodation  = "accommodation"
)

type CreateInput struct {
	Title       string
	Amount      float64
	Currency    string
	Category    Category
	ActivityID  *string
	ExpenseDate string // YYYY-MM-DD, optional — defaults to today
	Note        string
}

type UpdateInput struct {
	Title       string
	Amount      float64
	Currency    string
	Category    Category
	ActivityID  *string
	ExpenseDate string // YYYY-MM-DD, optional
	Note        string
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

// SyncLinkedExpenseTx keeps the expense of a booking's Cost field in step
// with it, inside the caller's transaction: amount > 0 updates the linked
// expense (or creates it, titled and dated after the booking), amount <= 0
// removes it. An edit only changes the amount and currency, so a title,
// category or date changed on the Budget tab is kept.
func (u *Usecase) SyncLinkedExpenseTx(
	ctx context.Context, tx pgx.Tx,
	userID, tripID, linkKind, bookingID, title, currency, category string,
	amount float64, expenseDate string,
) error {
	var column string
	switch linkKind {
	case LinkTransportation:
		column = "transportation_id"
	case LinkAccommodation:
		column = "accommodation_id"
	default:
		return fmt.Errorf("expense.SyncLinkedExpenseTx: unknown link kind %q", linkKind)
	}
	owner, base, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}

	existing, err := u.repo.FindLinkedTx(ctx, tx, column, bookingID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}
	if amount <= 0 {
		if existing == nil {
			return nil
		}
		return u.repo.DeleteTx(ctx, tx, existing.ID)
	}

	cat := Category(category)
	if existing != nil {
		cat = existing.Category
		title = existing.Title
	}
	if err := validateInput(title, amount, currency, cat); err != nil {
		return err
	}
	converted, _, err := u.converter.Convert(ctx, currency, base, amount)
	if err != nil {
		return convertErr("expense.SyncLinkedExpenseTx", err)
	}
	if existing != nil {
		return u.repo.UpdateCostTx(ctx, tx, existing.ID, amount, currency, converted, base)
	}

	// Date it on the travel / check-in day, or today when the booking has none.
	var eDate time.Time
	if expenseDate != "" {
		eDate, err = time.Parse("2006-01-02", expenseDate)
		if err != nil {
			return fmt.Errorf("expense.SyncLinkedExpenseTx: %w %q: %w", ErrInvalidDate, expenseDate, err)
		}
	}
	if eDate.IsZero() {
		eDate = time.Now().UTC().Truncate(24 * time.Hour)
	}
	e := &Expense{
		TripID:          tripID,
		Title:           title,
		Amount:          amount,
		Currency:        currency,
		ConvertedAmount: converted,
		BaseCurrency:    base,
		Category:        cat,
		ExpenseDate:     eDate,
	}
	if column == "transportation_id" {
		e.TransportationID = &bookingID
	} else {
		e.AccommodationID = &bookingID
	}
	_, err = u.repo.CreateTx(ctx, tx, e)
	return err
}

// RebaseTx reconverts every expense of the trip into newBase inside the
// caller's transaction. Called by trip.Update when the base currency changes,
// so stored converted_amount values never mix currencies. The caller has
// already verified trip ownership.
func (u *Usecase) RebaseTx(ctx context.Context, tx pgx.Tx, tripID, newBase string) error {
	expenses, err := u.repo.ListForRebaseTx(ctx, tx, tripID)
	if err != nil {
		return err
	}
	for _, e := range expenses {
		converted, _, err := u.converter.Convert(ctx, e.Currency, newBase, e.Amount)
		if err != nil {
			return fmt.Errorf("expense.RebaseTx convert %s→%s: %w: %w", e.Currency, newBase, apperr.ErrRatesUnavailable, err)
		}
		if err := u.repo.UpdateConvertedTx(ctx, tx, e.ID, converted, newBase); err != nil {
			return err
		}
	}
	return nil
}

func (u *Usecase) List(ctx context.Context, userID, tripID string) ([]Expense, error) {
	owner, _, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(ctx, tripID)
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, in CreateInput) (*Expense, error) {
	owner, base, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validateInput(in.Title, in.Amount, in.Currency, in.Category); err != nil {
		return nil, err
	}

	converted, _, err := u.converter.Convert(ctx, in.Currency, base, in.Amount)
	if err != nil {
		return nil, convertErr("expense.Create", err)
	}

	// Parse optional expense date; default to today
	var expDate time.Time
	if in.ExpenseDate != "" {
		var err error
		expDate, err = time.Parse("2006-01-02", in.ExpenseDate)
		if err != nil {
			return nil, fmt.Errorf("expense.Create: %w %q: %w", ErrInvalidDate, in.ExpenseDate, err)
		}
	}
	if expDate.IsZero() {
		expDate = time.Now().UTC().Truncate(24 * time.Hour)
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
		ExpenseDate:     expDate,
		Note:            in.Note,
	}
	return u.repo.Create(ctx, e)
}

func (u *Usecase) Update(ctx context.Context, userID, expenseID string, in UpdateInput) (*Expense, error) {
	owner, tripID, err := u.repo.FindExpenseOwner(ctx, expenseID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validateInput(in.Title, in.Amount, in.Currency, in.Category); err != nil {
		return nil, err
	}

	_, base, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	converted, _, err := u.converter.Convert(ctx, in.Currency, base, in.Amount)
	if err != nil {
		return nil, convertErr("expense.Update", err)
	}

	existing, err := u.repo.FindByID(ctx, expenseID)
	if err != nil {
		return nil, err
	}
	// Parse optional expense date
	if in.ExpenseDate != "" {
		d, err := time.Parse("2006-01-02", in.ExpenseDate)
		if err != nil {
			return nil, fmt.Errorf("expense.Update: %w %q: %w", ErrInvalidDate, in.ExpenseDate, err)
		}
		existing.ExpenseDate = d
	}

	existing.ActivityID = in.ActivityID
	existing.Title = in.Title
	existing.Amount = in.Amount
	existing.Currency = in.Currency
	existing.Category = in.Category
	existing.ConvertedAmount = converted
	existing.BaseCurrency = base
	existing.Note = in.Note

	return u.repo.Update(ctx, existing)
}

func (u *Usecase) Delete(ctx context.Context, userID, expenseID string) error {
	owner, _, err := u.repo.FindExpenseOwner(ctx, expenseID)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(ctx, expenseID)
}

func (u *Usecase) Summary(ctx context.Context, userID, tripID string) (*Summary, error) {
	owner, base, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.Summary(ctx, tripID, base)
}

// convertErr classifies a failed conversion: an unknown code is the caller's
// mistake (400), anything else means rates could not be fetched (503).
func convertErr(op string, err error) error {
	if errors.Is(err, apperr.ErrUnsupportedCurrency) {
		return fmt.Errorf("%s convert: %w: %w", op, ErrInvalidCurrency, err)
	}
	return fmt.Errorf("%s convert: %w: %w", op, apperr.ErrRatesUnavailable, err)
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
