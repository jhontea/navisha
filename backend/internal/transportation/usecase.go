package transportation

import (
	"context"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/jackc/pgx/v5"
)

type UsecaseInterface interface {
	List(userID, tripID string) ([]Transportation, error)
	Create(ctx context.Context, userID, tripID string, in CreateInput) (*Transportation, error)
	Update(userID, id string, in UpdateInput) (*Transportation, error)
	Delete(userID, id string) error
}

// ExpenseCreator is the cross-domain hook this usecase calls inside its
// transaction. expense.Usecase satisfies it via CreateLinkedExpenseTx.
type ExpenseCreator interface {
	CreateLinkedExpenseTx(
		ctx context.Context, tx pgx.Tx,
		userID, tripID, title, currency, category string, amount float64,
		expenseDate string,
	) error
}

// Cost is an optional add-on that creates an expense linked to the trip
// atomically with the transportation insert.
type Cost struct {
	Amount   float64
	Currency string
}

type CreateInput struct {
	Type              Type
	Label             string
	Operator          string
	ReferenceNumber   string
	FromLocation      string
	ToLocation        string
	DepartureDatetime *time.Time
	ArrivalDatetime   *time.Time
	Notes             string
	Cost              *Cost
}

type UpdateInput = CreateInput

type Usecase struct {
	repo           Repository
	expenseCreator ExpenseCreator
}

func NewUsecase(repo Repository, expenseCreator ExpenseCreator) *Usecase {
	return &Usecase{repo: repo, expenseCreator: expenseCreator}
}

var _ UsecaseInterface = (*Usecase)(nil)

func (u *Usecase) List(userID, tripID string) ([]Transportation, error) {
	owner, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(tripID)
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, in CreateInput) (*Transportation, error) {
	owner, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validate(in); err != nil {
		return nil, err
	}
	t := &Transportation{
		TripID:            tripID,
		Type:              in.Type,
		Label:             in.Label,
		Operator:          in.Operator,
		ReferenceNumber:   in.ReferenceNumber,
		FromLocation:      in.FromLocation,
		ToLocation:        in.ToLocation,
		DepartureDatetime: in.DepartureDatetime,
		ArrivalDatetime:   in.ArrivalDatetime,
		Notes:             in.Notes,
	}

	// No cost → single insert, no need for transaction.
	if in.Cost == nil {
		return u.repo.Insert(t)
	}

	// Cost present → atomic: transport + expense both succeed or both rolled back.
	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer u.repo.Rollback(ctx, tx)

	created, err := u.repo.InsertTx(ctx, tx, t)
	if err != nil {
		return nil, err
	}
	title := created.Label
	if title == "" {
		title = string(created.Type)
	}
	// Use departure date as the expense date so it groups by travel day
	var departureDate string
	if created.DepartureDatetime != nil {
		departureDate = created.DepartureDatetime.Format("2006-01-02")
	}
	if err := u.expenseCreator.CreateLinkedExpenseTx(
		ctx, tx, userID, tripID, title,
		in.Cost.Currency, "transport", in.Cost.Amount, departureDate,
	); err != nil {
		return nil, fmt.Errorf("transportation.Create linked expense: %w", err)
	}
	if err := u.repo.Commit(ctx, tx); err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) Update(userID, id string, in UpdateInput) (*Transportation, error) {
	owner, _, err := u.repo.FindTransportationOwner(id)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validate(in); err != nil {
		return nil, err
	}
	existing, err := u.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	existing.Type = in.Type
	existing.Label = in.Label
	existing.Operator = in.Operator
	existing.ReferenceNumber = in.ReferenceNumber
	existing.FromLocation = in.FromLocation
	existing.ToLocation = in.ToLocation
	existing.DepartureDatetime = in.DepartureDatetime
	existing.ArrivalDatetime = in.ArrivalDatetime
	existing.Notes = in.Notes
	return u.repo.Update(existing)
}

func (u *Usecase) Delete(userID, id string) error {
	owner, _, err := u.repo.FindTransportationOwner(id)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(id)
}

func validate(in CreateInput) error {
	if !in.Type.Valid() {
		return ErrInvalidType
	}
	// Sanity: arrival before departure makes no sense. Both nullable;
	// only enforce when both supplied.
	if in.DepartureDatetime != nil && in.ArrivalDatetime != nil &&
		in.ArrivalDatetime.Before(*in.DepartureDatetime) {
		return fmt.Errorf("arrival before departure")
	}
	return nil
}
