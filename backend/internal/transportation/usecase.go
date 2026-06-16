package transportation

import (
	"fmt"
	"time"

	"github.com/ahmadhafizh/navisha/backend/internal/apperr"
)

type UsecaseInterface interface {
	List(userID, tripID string) ([]Transportation, error)
	Create(userID, tripID string, in CreateInput) (*Transportation, error)
	Update(userID, id string, in UpdateInput) (*Transportation, error)
	Delete(userID, id string) error
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
}

type UpdateInput = CreateInput

type Usecase struct {
	repo Repository
}

func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
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

func (u *Usecase) Create(userID, tripID string, in CreateInput) (*Transportation, error) {
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
	return u.repo.Insert(t)
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
