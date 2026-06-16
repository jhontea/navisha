package transportation

import "time"

type Type string

const (
	TypeFlight Type = "flight"
	TypeBus    Type = "bus"
	TypeTrain  Type = "train"
	TypeFerry  Type = "ferry"
	TypeShip   Type = "ship"
	TypeCar    Type = "car"
	TypeOther  Type = "other"
)

func (t Type) Valid() bool {
	switch t {
	case TypeFlight, TypeBus, TypeTrain, TypeFerry, TypeShip, TypeCar, TypeOther:
		return true
	}
	return false
}

// DB columns named from_location / to_location (avoids `from` / `to` reserved
// keywords). Go fields named the same for clarity.
type Transportation struct {
	ID                string
	TripID            string
	Type              Type
	Label             string
	Operator          string
	ReferenceNumber   string
	FromLocation      string
	ToLocation        string
	DepartureDatetime *time.Time // nullable
	ArrivalDatetime   *time.Time
	Notes             string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
