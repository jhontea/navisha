package activity

import (
	"encoding/json"
	"time"
)

type Type string

const (
	TypeLocation Type = "location"
	TypeNote     Type = "note"
	TypeTodo     Type = "todo"
)

func (t Type) Valid() bool {
	switch t {
	case TypeLocation, TypeNote, TypeTodo:
		return true
	}
	return false
}

type Activity struct {
	ID         string
	DayID      string
	Type       Type
	Title      string
	StartTime  string // free-form HH:MM, optional
	EndTime    string
	OrderIndex int
	Payload    json.RawMessage
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Payload shapes per type — validated in usecase layer.

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
