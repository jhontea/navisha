package transportation

import "time"

// Type represents the mode of transportation.
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

// Transportation represents a trip transportation segment (flight, bus, train, etc.).
// DB columns use from_location/to_location to avoid reserved keywords.
type Transportation struct {
	ID                string     // Unique transportation ID
	TripID            string     // Parent trip ID
	Type              Type       // Transportation mode
	Label             string     // Human-readable label (e.g. "Garuda GA-123")
	Operator          string     // Operator name (e.g. "Garuda Indonesia")
	ReferenceNumber   string     // Booking/reference number
	FromLocation      string     // Departure location name
	ToLocation        string     // Arrival location name
	DepartureDatetime *time.Time // Departure datetime (nullable)
	ArrivalDatetime   *time.Time // Arrival datetime (nullable)
	Notes             string     // Optional notes
	CreatedAt         time.Time  // Record creation timestamp
	UpdatedAt         time.Time  // Last update timestamp
}
