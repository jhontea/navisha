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
	MaxDescriptionLen    = 500
	MaxDayInstructionLen = 500
	MaxPlaceLabelLen     = 200
	MaxEventNameLen      = 100
	MaxTravelers         = 20
	MaxChildren          = 10
)

// TransportModes are the accepted GenerateInput.TransportMode values ("" = not given).
var TransportModes = map[string]bool{"": true, "car": true, "train": true, "plane": true, "bus": true}

// TripNeeds are the accepted GenerateInput.Needs values. A fixed set keeps
// free text (and prompt injection) out of the planning rules they map to.
var TripNeeds = map[string]bool{
	"hotel_near_venue": true, "kids_playground": true, "food_near_venue": true, "easy_parking": true,
}

// PlaceInput is a user-resolved place (autocomplete or Google Maps link).
// Coordinates are optional: a typed address without a pick has none.
type PlaceInput struct {
	Label   string   `json:"label"`
	Address string   `json:"address"`
	Lat     *float64 `json:"lat"`
	Lng     *float64 `json:"lng"`
}

func (p *PlaceInput) hasCoords() bool { return p != nil && p.Lat != nil && p.Lng != nil }

// EventInput is the fixed anchor a trip is built around (a concert, fan
// meeting, wedding): its venue, date and times are never moved by the model.
type EventInput struct {
	Name      string
	Venue     PlaceInput
	Date      time.Time
	StartTime string // HH:MM
	EndTime   string // HH:MM
}

// Travelers describes who is going; ChildAges has one entry per child.
type Travelers struct {
	Adults    int   `json:"adults"`
	Children  int   `json:"children"`
	ChildAges []int `json:"child_ages"`
}

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

// TravelStyles are the accepted GenerateInput.TravelStyle values ("" = balanced).
var TravelStyles = map[string]bool{
	"": true, "balanced": true, "foodie": true, "cultural": true, "nature": true,
	"family": true, "relaxed": true, "backpacker": true, "luxury": true,
}

// GenerateInput is the user-supplied form data for an auto-generate request.
type GenerateInput struct {
	Destination  string    // "Tokyo, Japan"
	Description  string    // free-form intent, max MaxDescriptionLen chars
	StartDate    time.Time // inclusive
	EndDate      time.Time // inclusive
	BaseCurrency string    // ISO 4217, validated against supported list
	TravelStyle  string    // Phase 3F: style variant (backpacker, cultural, luxury, nature, foodie, balanced)

	// Optional structured context for event-centred trips. All zero = the
	// plain destination trip the prompt always handled.
	Origin        *PlaceInput // where the trip starts and ends (home address)
	TransportMode string      // car | train | plane | bus
	Event         *EventInput
	Travelers     *Travelers
	BudgetAmount  float64 // total budget in BaseCurrency; 0 = not given
	Needs         []string
}

// avoidsAirports reports whether the trip is overland, so a draft must not
// route it through an airport.
func (in GenerateInput) avoidsAirports() bool {
	return in.TransportMode != "" && in.TransportMode != "plane"
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
	Type         string `json:"type"`
	Title        string `json:"title"`
	StartTime    string `json:"start_time"` // HH:MM 24-hour format
	EndTime      string `json:"end_time"`   // HH:MM 24-hour format
	LocationName string `json:"location_name"`
	// PlaceQuery is the place's official name as it appears on maps (English
	// or local), without the city; City is where it is. Both feed geocoding.
	PlaceQuery           string   `json:"place_query,omitempty"`
	City                 string   `json:"city,omitempty"`
	Address              string   `json:"address"`
	Lat                  *float64 `json:"lat"`
	Lng                  *float64 `json:"lng"`
	GooglePlaceID        string   `json:"google_place_id"`
	LocationVerification string   `json:"location_verification,omitempty"`
	LocationConfidence   *float64 `json:"location_confidence,omitempty"`
	Category             string   `json:"category"` // kuliner | wisata alam | budaya | belanja | transportasi | akomodasi
	Notes                string   `json:"notes"`
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
