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
	// DepartTime is when the user wants to leave the origin on the first
	// day (HH:MM); "" = not given.
	DepartTime string

	// Nearby are real places around the event venue, found by the usecase
	// before the LLM call (not user input). The model picks from them.
	Nearby []VenuePlace
}

// hasNeed reports whether the user ticked need.
func (in GenerateInput) hasNeed(need string) bool {
	for _, n := range in.Needs {
		if n == need {
			return true
		}
	}
	return false
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

	// Bookings and the planned budget split. They are saved as transport,
	// stay and budget_categories rows, never as itinerary activities (the day
	// timeline already shows bookings next to activities).
	TransportLegs   []TransportLegDraft `json:"transport_legs"`
	Lodging         []LodgingDraft      `json:"lodging"`
	BudgetBreakdown BudgetBreakdown     `json:"budget_breakdown"`
}

// MaxTransportLegs / MaxLodging cap the bookings in one draft.
const (
	MaxTransportLegs = 6
	MaxLodging       = 3
)

// LegModes are the accepted TransportLegDraft.Mode values. They match
// transportation.Type names.
var LegModes = map[string]bool{"car": true, "train": true, "flight": true, "bus": true}

// TransportLegDraft is one journey: home to the destination, back, or
// between cities. Dates are YYYY-MM-DD and times HH:MM, local wall clock.
type TransportLegDraft struct {
	Mode          string  `json:"mode"`
	Label         string  `json:"label"`
	FromLocation  string  `json:"from_location"`
	ToLocation    string  `json:"to_location"`
	DepartureDate string  `json:"departure_date"`
	DepartureTime string  `json:"departure_time"`
	ArrivalDate   string  `json:"arrival_date"`
	ArrivalTime   string  `json:"arrival_time"`
	EstimatedCost float64 `json:"estimated_cost"` // whole leg, in the trip currency
	Notes         string  `json:"notes"`
}

// LodgingDraft is one stay. Lat/Lng/Address/GooglePlaceID are filled by the
// frontend resolver, like activity locations; the model's values are dropped.
type LodgingDraft struct {
	Name                  string  `json:"name"`
	LocationName          string  `json:"location_name"`
	PlaceQuery            string  `json:"place_query"`
	City                  string  `json:"city"`
	CheckInDate           string  `json:"check_in_date"`
	CheckInTime           string  `json:"check_in_time"`
	CheckOutDate          string  `json:"check_out_date"`
	CheckOutTime          string  `json:"check_out_time"`
	EstimatedCostPerNight float64 `json:"estimated_cost_per_night"`
	Notes                 string  `json:"notes"`
	// CandidateID is the model's pick from GenerateInput.Nearby ("H1");
	// it is resolved to coordinates and cleared during validation.
	CandidateID   string   `json:"candidate_id,omitempty"`
	Address       string   `json:"address"`
	Lat           *float64 `json:"lat"`
	Lng           *float64 `json:"lng"`
	GooglePlaceID string   `json:"google_place_id"`
}

// BudgetBreakdown is the planned spend per expense category, in the trip
// currency. Keys match the trip's budget_categories.
type BudgetBreakdown struct {
	Transport     float64 `json:"transport"`
	Accommodation float64 `json:"accommodation"`
	Food          float64 `json:"food"`
	Activity      float64 `json:"activity"`
	Other         float64 `json:"other"`
}

// Categories returns the non-zero amounts keyed by expense category.
func (b BudgetBreakdown) Categories() map[string]float64 {
	out := map[string]float64{}
	for k, v := range map[string]float64{
		"transport": b.Transport, "accommodation": b.Accommodation, "food": b.Food,
		"activity": b.Activity, "other": b.Other,
	} {
		if v > 0 {
			out[k] = v
		}
	}
	return out
}

// Total sums the breakdown.
func (b BudgetBreakdown) Total() float64 {
	return b.Transport + b.Accommodation + b.Food + b.Activity + b.Other
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
	PlaceQuery string `json:"place_query,omitempty"`
	City       string `json:"city,omitempty"`
	// CandidateID: see LodgingDraft.CandidateID.
	CandidateID          string   `json:"candidate_id,omitempty"`
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
