package transportation

import "errors"

var (
	ErrNotFound     = errors.New("transportation not found")
	ErrTripNotFound = errors.New("trip not found")
	ErrInvalidType  = errors.New("invalid transportation type")
)

type Repository interface {
	// Ownership: trip → user JOIN.
	FindTripOwner(tripID string) (userID string, err error)
	// Ownership: transportation → trip → user JOIN.
	FindTransportationOwner(id string) (userID, tripID string, err error)

	List(tripID string) ([]Transportation, error)
	FindByID(id string) (*Transportation, error)
	Insert(t *Transportation) (*Transportation, error)
	Update(t *Transportation) (*Transportation, error)
	Delete(id string) error
}
