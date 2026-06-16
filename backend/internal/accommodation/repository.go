package accommodation

import "errors"

var (
	ErrNotFound     = errors.New("accommodation not found")
	ErrTripNotFound = errors.New("trip not found")
	ErrInvalidDates = errors.New("invalid accommodation dates")
	ErrInvalidName  = errors.New("name required")
)

type Repository interface {
	FindTripOwner(tripID string) (userID string, err error)
	FindAccommodationOwner(id string) (userID, tripID string, err error)

	List(tripID string) ([]Accommodation, error)
	FindByID(id string) (*Accommodation, error)
	Insert(a *Accommodation) (*Accommodation, error)
	Update(a *Accommodation) (*Accommodation, error)
	Delete(id string) error
}
