// Package autogen turns a short user prompt into a structured trip draft via
// an LLM. It is intentionally decoupled from the persistence domains: the
// usecase returns a draft, and a separate TripCreator (wired in main.go)
// performs the actual persistence.
package autogen

import "time"

// MaxTripDays is the hard cap on the number of days a generated trip may span.
// Keeps LLM latency and cost bounded.
const MaxTripDays = 10

// MaxActivitiesPerDay caps activities per day in a generated draft.
const MaxActivitiesPerDay = 6

// MaxDestinationLen / MaxDescriptionLen bound the free-text inputs.
const (
	MaxDestinationLen    = 60
	MaxDescriptionLen    = 100
	MaxDayInstructionLen = 500
)

// DayContext is the persisted context used to generate suggestions for one
// itinerary day. Existing activities are anchors and are never replaced.
type DayContext struct {
	TripID      string
	DayID       string
	Destination string
	TripTitle   string
	DayNumber   int
	Date        string
	DayTitle    string
	Existing    []DayActivityContext
}

type DayActivityContext struct {
	Title        string
	StartTime    string
	EndTime      string
	LocationName string
}

type GenerateDayInput struct {
	TripID      string
	DayID       string
	Instruction string
}

type DayPreview struct {
	Theme      string          `json:"theme"`
	Activities []ActivityDraft `json:"activities"`
}

// GenerateInput is the user-supplied form data for an auto-generate request.
type GenerateInput struct {
	Destination  string    // "Tokyo, Japan"
	Description  string    // free-form intent, max 100 chars
	StartDate    time.Time // inclusive
	EndDate      time.Time // inclusive
	BaseCurrency string    // ISO 4217, validated against supported list
	TravelStyle  string    // Phase 3F: style variant (backpacker, cultural, luxury, nature, foodie, balanced)
}

// TripDraft is the structured itinerary returned by the LLM (after validation).
// It is NOT persisted until the user approves it.
type TripDraft struct {
	Title        string     `json:"title"`
	Destination  string     `json:"destination"`
	TotalDays    int        `json:"total_days"`
	TravelStyle  string     `json:"travel_style"`
	Summary      string     `json:"summary"`
	BaseCurrency string     `json:"base_currency"`
	Budget       float64    `json:"budget"`
	Days         []DayDraft `json:"days"`
	Tips         []string   `json:"tips"`
}

// DayDraft is one day of the generated itinerary.
type DayDraft struct {
	DayNumber  int             `json:"day_number"`
	Date       string          `json:"date"` // YYYY-MM-DD
	Theme      string          `json:"theme"`
	Activities []ActivityDraft `json:"activities"`
}

// ActivityDraft mirrors the activity domain's shape but stays decoupled.
// Type is "location" or "note" (todo/transport/accommodation skipped for MVP).
// Address and GooglePlaceID are populated by the frontend resolver (not the LLM)
// using Google Places, matching the manual form flow.
type ActivityDraft struct {
	Type          string   `json:"type"`
	Title         string   `json:"title"`
	StartTime     string   `json:"start_time"` // HH:MM 24-hour format
	EndTime       string   `json:"end_time"`   // HH:MM 24-hour format
	LocationName  string   `json:"location_name"`
	Address       string   `json:"address"`
	Lat           *float64 `json:"lat"`
	Lng           *float64 `json:"lng"`
	GooglePlaceID string   `json:"google_place_id"`
	Category      string   `json:"category"` // kuliner | wisata alam | budaya | belanja | transportasi | akomodasi
	Notes         string   `json:"notes"`
}

// llmResponse is the raw envelope the model is instructed to return. The guard
// fields (ok/reason) let the model reject nonsense input without fabricating a
// trip; trip is only populated when ok is true.
type llmResponse struct {
	OK     bool       `json:"ok"`
	Reason string     `json:"reason"`
	Trip   *TripDraft `json:"trip"`
}

type dayLLMResponse struct {
	OK         bool            `json:"ok"`
	Reason     string          `json:"reason"`
	Theme      string          `json:"theme"`
	Activities []ActivityDraft `json:"activities"`
}
