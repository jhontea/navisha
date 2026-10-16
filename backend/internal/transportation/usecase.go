package transportation

import (
	"context"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/pkg/dbtx"
	"github.com/jackc/pgx/v5"
)

type UsecaseInterface interface {
	List(ctx context.Context, userID, tripID string) ([]Transportation, error)
	Create(ctx context.Context, userID, tripID string, in CreateInput) (*Transportation, error)
	Update(ctx context.Context, userID, id string, in UpdateInput) (*Transportation, error)
	Delete(ctx context.Context, userID, id string) error
}

// ExpenseCreator is the cross-domain hook this usecase calls inside its
// transaction. expense.Usecase satisfies it via SyncLinkedExpenseTx.
type ExpenseCreator interface {
	SyncLinkedExpenseTx(
		ctx context.Context, tx pgx.Tx,
		userID, tripID, linkKind, bookingID, title, currency, category string,
		amount float64, expenseDate string,
	) error
}

// Cost is an optional add-on that creates an expense linked to the trip
// atomically with the transportation insert.
type Cost struct {
	Amount   float64
	Currency string
}

// linkKind names this booking kind to the expense domain.
const linkKind = "transportation"

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

func (u *Usecase) List(ctx context.Context, userID, tripID string) ([]Transportation, error) {
	owner, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(ctx, tripID)
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, in CreateInput) (*Transportation, error) {
	owner, err := u.repo.FindTripOwner(ctx, tripID)
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
		return u.repo.Insert(ctx, t)
	}

	// Cost present → atomic: transport + expense both succeed or both rolled back.
	var created *Transportation
	err = dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if created, err = u.repo.InsertTx(ctx, tx, t); err != nil {
			return err
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
		if err := u.expenseCreator.SyncLinkedExpenseTx(
			ctx, tx, userID, tripID, linkKind, created.ID, title,
			in.Cost.Currency, "transport", in.Cost.Amount, departureDate,
		); err != nil {
			return fmt.Errorf("transportation.Create linked expense: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) Update(ctx context.Context, userID, id string, in UpdateInput) (*Transportation, error) {
	owner, _, err := u.repo.FindTransportationOwner(ctx, id)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	if err := validate(in); err != nil {
		return nil, err
	}
	existing, err := u.repo.FindByID(ctx, id)
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
	if in.Cost == nil {
		return u.repo.Update(ctx, existing)
	}

	// A cost was sent with the edit: save both together. An amount of 0
	// removes the linked expense.
	var updated *Transportation
	err = dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if updated, err = u.repo.UpdateTx(ctx, tx, existing); err != nil {
			return err
		}
		title := updated.Label
		if title == "" {
			title = string(updated.Type)
		}
		var date string
		if updated.DepartureDatetime != nil {
			date = updated.DepartureDatetime.Format("2006-01-02")
		}
		if err := u.expenseCreator.SyncLinkedExpenseTx(
			ctx, tx, userID, updated.TripID, linkKind, updated.ID, title,
			in.Cost.Currency, "transport", in.Cost.Amount, date,
		); err != nil {
			return fmt.Errorf("transportation.Update linked expense: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (u *Usecase) Delete(ctx context.Context, userID, id string) error {
	owner, _, err := u.repo.FindTransportationOwner(ctx, id)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(ctx, id)
}

func validate(in CreateInput) error {
	if !in.Type.Valid() {
		return ErrInvalidType
	}
	// Sanity: arrival before departure makes no sense. Both nullable;
	// only enforce when both supplied.
	if in.DepartureDatetime != nil && in.ArrivalDatetime != nil &&
		in.ArrivalDatetime.Before(*in.DepartureDatetime) {
		return ErrArrivalBeforeDeparture
	}
	return nil
}
