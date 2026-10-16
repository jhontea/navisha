package accommodation

import (
	"context"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/ahmadhafizh/navisha/backend/pkg/dbtx"
	"github.com/jackc/pgx/v5"
)

type UsecaseInterface interface {
	List(ctx context.Context, userID, tripID string) ([]Accommodation, error)
	Create(ctx context.Context, userID, tripID string, in CreateInput) (*Accommodation, error)
	Update(ctx context.Context, userID, id string, in UpdateInput) (*Accommodation, error)
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

type Cost struct {
	Amount   float64
	Currency string
}

// linkKind names this booking kind to the expense domain.
const linkKind = "accommodation"

type CreateInput struct {
	AccommodationType  AccommodationType
	Name               string
	LocationName       string
	Lat                *float64
	Lng                *float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
	CheckInTime        string
	CheckOutTime       string
	ConfirmationNumber string
	Notes              string
	Cost               *Cost
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

func (u *Usecase) List(ctx context.Context, userID, tripID string) ([]Accommodation, error) {
	owner, err := u.repo.FindTripOwner(ctx, tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(ctx, tripID)
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, in CreateInput) (*Accommodation, error) {
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
	accType := in.AccommodationType
	if !accType.Valid() {
		if accType == "" {
			accType = TypeHotel // zero value = default
		} else {
			return nil, fmt.Errorf("%w: %q", ErrInvalidType, accType)
		}
	}
	a := &Accommodation{
		TripID:             tripID,
		AccommodationType:  accType,
		Name:               in.Name,
		LocationName:       in.LocationName,
		Lat:                in.Lat,
		Lng:                in.Lng,
		GooglePlaceID:      in.GooglePlaceID,
		CheckIn:            in.CheckIn,
		CheckInTime:        in.CheckInTime,
		CheckOutTime:       in.CheckOutTime,
		CheckOut:           in.CheckOut,
		ConfirmationNumber: in.ConfirmationNumber,
		Notes:              in.Notes,
	}

	if in.Cost == nil {
		return u.repo.Insert(ctx, a)
	}

	// Atomic: accommodation + linked expense both commit or both roll back.
	var created *Accommodation
	err = dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if created, err = u.repo.InsertTx(ctx, tx, a); err != nil {
			return err
		}
		// Use check-in date as the expense date so it groups correctly on budget page
		checkinDate := created.CheckIn.Format("2006-01-02")
		if err := u.expenseCreator.SyncLinkedExpenseTx(
			ctx, tx, userID, tripID, linkKind, created.ID, created.Name,
			in.Cost.Currency, "accommodation", in.Cost.Amount, checkinDate,
		); err != nil {
			return fmt.Errorf("accommodation.Create linked expense: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) Update(ctx context.Context, userID, id string, in UpdateInput) (*Accommodation, error) {
	owner, _, err := u.repo.FindAccommodationOwner(ctx, id)
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
	accType := in.AccommodationType
	if !accType.Valid() {
		if accType != "" {
			return nil, fmt.Errorf("%w: %q", ErrInvalidType, accType)
		}
		accType = existing.AccommodationType // keep existing type if not provided
	}
	existing.AccommodationType = accType
	existing.Name = in.Name
	existing.LocationName = in.LocationName
	existing.Lat = in.Lat
	existing.Lng = in.Lng
	existing.GooglePlaceID = in.GooglePlaceID
	existing.CheckIn = in.CheckIn
	existing.CheckOut = in.CheckOut
	existing.CheckInTime = in.CheckInTime
	existing.CheckOutTime = in.CheckOutTime
	existing.ConfirmationNumber = in.ConfirmationNumber
	existing.Notes = in.Notes
	if in.Cost == nil {
		return u.repo.Update(ctx, existing)
	}

	// A cost was sent with the edit: save both together. An amount of 0
	// removes the linked expense.
	var updated *Accommodation
	err = dbtx.WithTx(ctx, u.repo, func(tx pgx.Tx) error {
		var err error
		if updated, err = u.repo.UpdateTx(ctx, tx, existing); err != nil {
			return err
		}
		title := updated.Name
		date := updated.CheckIn.Format("2006-01-02")
		if err := u.expenseCreator.SyncLinkedExpenseTx(
			ctx, tx, userID, updated.TripID, linkKind, updated.ID, title,
			in.Cost.Currency, "accommodation", in.Cost.Amount, date,
		); err != nil {
			return fmt.Errorf("accommodation.Update linked expense: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (u *Usecase) Delete(ctx context.Context, userID, id string) error {
	owner, _, err := u.repo.FindAccommodationOwner(ctx, id)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(ctx, id)
}

func validate(in CreateInput) error {
	if in.Name == "" {
		return ErrInvalidName
	}
	if in.CheckIn.IsZero() || in.CheckOut.IsZero() {
		return ErrInvalidDates
	}
	if in.CheckOut.Before(in.CheckIn) {
		return ErrInvalidDates
	}
	return nil
}
