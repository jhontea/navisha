package accommodation

import (
	"context"
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
	"github.com/jackc/pgx/v5"
)

type UsecaseInterface interface {
	List(userID, tripID string) ([]Accommodation, error)
	Create(ctx context.Context, userID, tripID string, in CreateInput) (*Accommodation, error)
	Update(userID, id string, in UpdateInput) (*Accommodation, error)
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

type Cost struct {
	Amount   float64
	Currency string
}

type CreateInput struct {
	AccommodationType  AccommodationType
	Name               string
	LocationName       string
	Lat                *float64
	Lng                *float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
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

func (u *Usecase) List(userID, tripID string) ([]Accommodation, error) {
	owner, err := u.repo.FindTripOwner(tripID)
	if err != nil {
		return nil, err
	}
	if owner != userID {
		return nil, apperr.ErrForbidden
	}
	return u.repo.List(tripID)
}

func (u *Usecase) Create(ctx context.Context, userID, tripID string, in CreateInput) (*Accommodation, error) {
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
	accType := in.AccommodationType
	if !accType.Valid() {
		accType = TypeHotel
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
		CheckOut:           in.CheckOut,
		ConfirmationNumber: in.ConfirmationNumber,
		Notes:              in.Notes,
	}

	if in.Cost == nil {
		return u.repo.Insert(a)
	}

	// Atomic: accommodation + linked expense both commit or both roll back.
	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	defer u.repo.Rollback(ctx, tx)

	created, err := u.repo.InsertTx(ctx, tx, a)
	if err != nil {
		return nil, err
	}
	// Use check-in date as the expense date so it groups correctly on budget page
	checkinDate := created.CheckIn.Format("2006-01-02")
	if err := u.expenseCreator.CreateLinkedExpenseTx(
		ctx, tx, userID, tripID, created.Name,
		in.Cost.Currency, "accommodation", in.Cost.Amount, checkinDate,
	); err != nil {
		return nil, fmt.Errorf("accommodation.Create linked expense: %w", err)
	}
	if err := u.repo.Commit(ctx, tx); err != nil {
		return nil, err
	}
	return created, nil
}

func (u *Usecase) Update(userID, id string, in UpdateInput) (*Accommodation, error) {
	owner, _, err := u.repo.FindAccommodationOwner(id)
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
	accType := in.AccommodationType
	if !accType.Valid() {
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
	existing.ConfirmationNumber = in.ConfirmationNumber
	existing.Notes = in.Notes
	return u.repo.Update(existing)
}

func (u *Usecase) Delete(userID, id string) error {
	owner, _, err := u.repo.FindAccommodationOwner(id)
	if err != nil {
		return err
	}
	if owner != userID {
		return apperr.ErrForbidden
	}
	return u.repo.Delete(id)
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
