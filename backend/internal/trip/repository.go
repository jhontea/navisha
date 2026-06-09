package trip

import "errors"

var (
	ErrNotFound          = errors.New("trip not found")
	ErrDayNotFound       = errors.New("day not found")
	ErrActivityNotFound  = errors.New("activity not found")
	ErrInvalidType       = errors.New("invalid activity type")
	ErrTransportNotFound      = errors.New("transportation not found")
	ErrAccommodationNotFound  = errors.New("accommodation not found")
)

type Repository interface {
	List(userID string) ([]Trip, error)
	FindByID(id string) (*Trip, error)
	Create(t *Trip) (*Trip, error)
	Update(t *Trip) (*Trip, error)
	Delete(id string) error

	ListDays(tripID string) ([]Day, error)
	FindDayByID(id string) (*Day, error)

	ListActivities(dayID string) ([]Activity, error)
	FindActivityByID(id string) (*Activity, error)
	CreateActivity(a *Activity) (*Activity, error)
	UpdateActivity(a *Activity) (*Activity, error)
	DeleteActivity(id string) error
	ReorderActivities(dayID string, orderedIDs []string) error

	ListTransportations(tripID string) ([]Transportation, error)
	CreateTransportation(t *Transportation) (*Transportation, error)
	UpdateTransportation(t *Transportation) (*Transportation, error)
	DeleteTransportation(id string) error

	ListAccommodations(tripID string) ([]Accommodation, error)
	CreateAccommodation(a *Accommodation) (*Accommodation, error)
	UpdateAccommodation(a *Accommodation) (*Accommodation, error)
	DeleteAccommodation(id string) error
}
