package accommodation

import (
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

type UsecaseInterface interface {
	List(userID, tripID string) ([]Accommodation, error)
	Create(userID, tripID string, in CreateInput) (*Accommodation, error)
	Update(userID, id string, in UpdateInput) (*Accommodation, error)
	Delete(userID, id string) error
}

type CreateInput struct {
	Name               string
	LocationName       string
	Lat                *float64
	Lng                *float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
	ConfirmationNumber string
	Notes              string
}

type UpdateInput = CreateInput

type Usecase struct {
	repo Repository
}

func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
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

func (u *Usecase) Create(userID, tripID string, in CreateInput) (*Accommodation, error) {
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
	a := &Accommodation{
		TripID:             tripID,
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
	return u.repo.Insert(a)
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
