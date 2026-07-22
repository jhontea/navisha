package activity

import (
	"encoding/json"
	"time"
)

// Type represents the kind of activity.
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

// Activity represents a polymorphic activity attached to a trip day.
// The Type field determines which Payload shape is used.
type Activity struct {
	ID         string          // Unique activity ID
	DayID      string          // Parent day ID
	Type       Type            // Activity type: location, note, or todo
	Title      string          // Activity title
	StartTime  string          // Start time in HH:MM format (optional)
	EndTime    string          // End time in HH:MM format (optional)
	OrderIndex int             // Display order within the day
	Payload    json.RawMessage // Type-specific payload (JSONB in DB)
	CreatedAt  time.Time       // Record creation timestamp
	UpdatedAt  time.Time       // Last update timestamp
}

// Payload shapes per type — validated in usecase layer.

// LocationPayload holds data for location-type activities.
type LocationPayload struct {
	LocationName  string   `json:"location_name"`   // Human-readable location name
	Lat           float64  `json:"lat"`             // Latitude coordinate
	Lng           float64  `json:"lng"`             // Longitude coordinate
	GooglePlaceID string   `json:"google_place_id"` // Google Places ID for linking
	Address       string   `json:"address"`         // Full address
	Notes         string   `json:"notes"`           // Location-specific notes
	ExternalURL   string   `json:"external_url"`    // Optional official or booking URL
	ImageURLs     []string `json:"image_urls"`      // Associated image URLs
}

// NotePayload holds data for note-type activities.
type NotePayload struct {
	Content string `json:"content"` // Free-form note content
}

// TodoItem represents a single todo checklist item.
type TodoItem struct {
	ID        string `json:"id"`        // Unique item ID
	Text      string `json:"text"`      // Todo text
	Completed bool   `json:"completed"` // Completion status
}

// TodoPayload holds data for todo-type activities.
type TodoPayload struct {
	Items []TodoItem `json:"items"` // Checklist items
}
