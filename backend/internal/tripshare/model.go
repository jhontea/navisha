package tripshare

import (
	"encoding/json"
	"time"
)

type Link struct {
	ID        string
	TripID    string
	CreatedBy string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

type PublicActivity struct {
	ID        string          `json:"id"`
	Title     string          `json:"title"`
	StartTime string          `json:"start_time"`
	EndTime   string          `json:"end_time"`
	Payload   json.RawMessage `json:"payload"`
}

type PublicDay struct {
	ID         string           `json:"id"`
	Date       string           `json:"date"`
	DayNumber  int              `json:"day_number"`
	Title      string           `json:"title"`
	Activities []PublicActivity `json:"activities"`
}

type PublicTransportation struct {
	ID                string     `json:"id"`
	Type              string     `json:"type"`
	Label             string     `json:"label"`
	Operator          string     `json:"operator"`
	FromLocation      string     `json:"from_location"`
	ToLocation        string     `json:"to_location"`
	DepartureDatetime *time.Time `json:"departure_datetime"`
	ArrivalDatetime   *time.Time `json:"arrival_datetime"`
}

type PublicAccommodation struct {
	ID                string `json:"id"`
	AccommodationType string `json:"accommodation_type"`
	Name              string `json:"name"`
	LocationName      string `json:"location_name"`
	CheckIn           string `json:"check_in"`
	CheckOut          string `json:"check_out"`
}

type PublicItinerary struct {
	Title           string                 `json:"title"`
	Description     string                 `json:"description"`
	StartDate       string                 `json:"start_date"`
	EndDate         string                 `json:"end_date"`
	CoverImageURL   string                 `json:"cover_image_url"`
	ExpiresAt       time.Time              `json:"expires_at"`
	Days            []PublicDay            `json:"days"`
	Transportations []PublicTransportation `json:"transportations"`
	Accommodations  []PublicAccommodation  `json:"accommodations"`
}
