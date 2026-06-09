package trip

import (
	"encoding/json"
	"time"
)

type Trip struct {
	ID            string
	UserID        string
	Title         string
	Description   string
	StartDate     time.Time
	EndDate       time.Time
	BaseCurrency  string
	CoverImageURL string
	Notes         string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Day struct {
	ID         string
	TripID     string
	Date       time.Time
	DayNumber  int
	Notes      string
	Activities []Activity
}

type ActivityType string

const (
	ActivityTypeLocation ActivityType = "location"
	ActivityTypeNote     ActivityType = "note"
	ActivityTypeTodo     ActivityType = "todo"
)

type Activity struct {
	ID         string
	DayID      string
	Type       ActivityType
	Title      string
	StartTime  string
	EndTime    string
	OrderIndex int
	Payload    json.RawMessage
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Payload shapes per activity type — validated in usecase layer.

type LocationPayload struct {
	LocationName  string   `json:"location_name"`
	Lat           float64  `json:"lat"`
	Lng           float64  `json:"lng"`
	GooglePlaceID string   `json:"google_place_id"`
	Address       string   `json:"address"`
	Notes         string   `json:"notes"`
	ImageURLs     []string `json:"image_urls"`
}

type NotePayload struct {
	Content string `json:"content"`
}

type TodoItem struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type TodoPayload struct {
	Items []TodoItem `json:"items"`
}

type Transportation struct {
	ID                string
	TripID            string
	Type              string
	Label             string
	Operator          string
	ReferenceNumber   string
	From              string
	To                string
	DepartureDatetime time.Time
	ArrivalDatetime   time.Time
	Notes             string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Accommodation struct {
	ID                 string
	TripID             string
	Name               string
	LocationName       string
	Lat                float64
	Lng                float64
	GooglePlaceID      string
	CheckIn            time.Time
	CheckOut           time.Time
	ConfirmationNumber string
	Notes              string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
