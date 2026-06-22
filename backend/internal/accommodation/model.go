package accommodation

import "time"

// AccommodationType is the kind of lodging.
type AccommodationType string

const (
	TypeHotel     AccommodationType = "hotel"
	TypeHostel    AccommodationType = "hostel"
	TypeApartment AccommodationType = "apartment"
	TypeOther     AccommodationType = "other"
)

func (t AccommodationType) Valid() bool {
	switch t {
	case TypeHotel, TypeHostel, TypeApartment, TypeOther:
		return true
	}
	return false
}

// Accommodation is trip-level lodging. lat/lng optional (nullable in DB).
type Accommodation struct {
	ID                 string
	TripID             string
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
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
