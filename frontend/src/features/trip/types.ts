export interface Trip {
  id: string
  user_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  base_currency: string
  budget: number
  budget_categories?: Record<string, number>
  cover_image_url: string
  notes: string
  created_at: string
  updated_at: string
}

export interface TripDetail extends Trip {
  days: Day[]
}

export interface TripListResponse {
  items: Trip[]
  next_cursor: string
}

export interface DashboardTripsResponse {
  upcoming: { items: Trip[] }
  trips: TripListResponse
}

export interface CreateTripInput {
  title: string
  description?: string
  start_date: string // YYYY-MM-DD
  end_date: string
  base_currency: string
  budget?: number
  budget_categories?: Record<string, number>
  cover_image_url?: string
  notes?: string
}

export type UpdateTripInput = CreateTripInput

export interface Day {
  id: string
  trip_id: string
  date: string
  day_number: number
  title: string
  notes: string
}

export interface Transportation {
  id: string
  trip_id: string
  type: string
  label: string
  operator: string
  reference_number: string
  from_location: string
  to_location: string
  departure_datetime: string
  arrival_datetime: string
  notes: string
}

export interface Accommodation {
  id: string
  trip_id: string
  name: string
  location_name: string
  lat: number
  lng: number
  google_place_id: string
  check_in: string
  check_out: string
  confirmation_number: string
  notes: string
}

// --- Auto-generate (F5) ---

export interface GenerateTripInput {
  destination: string
  description?: string
  start_date: string // YYYY-MM-DD
  end_date: string
  base_currency: string
  /** Shapes the whole itinerary; empty means balanced. */
  travel_style?: TravelStyle
  // Optional context for a trip built around one event (all omitted = plain trip).
  /** Where the trip starts and ends, e.g. home. */
  origin?: GeneratePlace
  transport_mode?: TransportMode
  /** When to leave the origin on the first day, HH:MM. Needs origin. */
  depart_time?: string
  /** Fixed anchor: the model never moves its venue or times. */
  event?: GenerateEvent
  travelers?: GenerateTravelers
  /** Total budget in base_currency. */
  budget_amount?: number
  needs?: TripNeed[]
}

/** A place the user picked (autocomplete or Maps link) or just typed. */
export interface GeneratePlace {
  label: string
  address?: string
  lat?: number
  lng?: number
}

export type TransportMode = "car" | "train" | "plane" | "bus"

export interface GenerateEvent {
  name: string
  venue: GeneratePlace
  date: string // YYYY-MM-DD, within the trip
  start_time: string // HH:MM
  end_time: string
}

export interface GenerateTravelers {
  adults: number
  children: number
  /** One age per child. */
  child_ages: number[]
}

export type TripNeed = "hotel_near_venue" | "kids_playground" | "food_near_venue" | "easy_parking"

export type TravelStyle =
  | "balanced"
  | "foodie"
  | "cultural"
  | "nature"
  | "family"
  | "relaxed"
  | "backpacker"
  | "luxury"

export interface ActivityDraft {
  type: "location" | "note"
  title: string
  start_time: string
  end_time: string
  location_name: string
  /** Official name as on maps (English or local), for geocoding. */
  place_query?: string
  /** "City, Country" where the place is, for geocoding. */
  city?: string
  address: string
  lat: number | null
  lng: number | null
  google_place_id: string
  location_verification?: "verified" | "needs_review"
  location_confidence?: number | null
  category: string // kuliner | wisata alam | budaya | belanja | transportasi | akomodasi
  notes: string
}

export interface DayDraft {
  day_number: number
  date: string
  theme: string
  activities: ActivityDraft[]
}

export interface TripDraft {
  title: string
  destination: string
  total_days: number
  travel_style: string
  summary: string
  base_currency: string
  budget: number
  days: DayDraft[]
  tips: string[]
  // Saved as transport, stay and planned-budget rows, not as activities.
  // Optional: drafts from before these fields existed have none.
  transport_legs?: TransportLegDraft[]
  lodging?: LodgingDraft[]
  budget_breakdown?: BudgetBreakdown
}

export interface TransportLegDraft {
  mode: "car" | "train" | "flight" | "bus"
  label: string
  from_location: string
  to_location: string
  departure_date: string // YYYY-MM-DD
  departure_time: string // HH:MM
  arrival_date: string
  arrival_time: string
  /** Whole leg, in the trip currency. */
  estimated_cost: number
  notes: string
}

export interface LodgingDraft {
  name: string
  location_name: string
  place_query: string
  city: string
  check_in_date: string // YYYY-MM-DD
  check_in_time: string // HH:MM or ""
  check_out_date: string
  check_out_time: string
  estimated_cost_per_night: number
  notes: string
  /** Filled by resolveDraftLocations when the hotel is found on the map. */
  address: string
  lat: number | null
  lng: number | null
  google_place_id: string
}

/** Planned spend per expense category, in the trip currency. */
export interface BudgetBreakdown {
  transport: number
  accommodation: number
  food: number
  activity: number
  other: number
}

// Response envelope from POST /trips/generate
export interface GenerateTripResponse {
  start_date: string
  end_date: string
  draft: TripDraft
}

export interface DayPreview {
  theme: string
  activities: ActivityDraft[]
}

export type ShareDurationDays = 1 | 3 | 7 | 14 | 30

export interface TripShareLink {
  token: string
  expires_at: string
}

export interface PublicActivityPayload {
  location_name?: string
  address?: string
  lat?: number
  lng?: number
  external_url?: string
  image_urls?: string[]
  /** A note's text (note activities only). */
  content?: string
}

export interface PublicTripActivity {
  id: string
  /** "location" or "note" (older links may omit it: a place). */
  type?: "location" | "note"
  title: string
  start_time: string
  end_time: string
  payload: PublicActivityPayload
}

export interface PublicTripDay {
  id: string
  date: string
  day_number: number
  title: string
  activities: PublicTripActivity[]
}

export interface PublicTransportation {
  id: string
  type: string
  label: string
  operator: string
  from_location: string
  to_location: string
  departure_datetime: string | null
  arrival_datetime: string | null
}

export interface PublicAccommodation {
  id: string
  accommodation_type: string
  name: string
  location_name: string
  check_in: string
  check_out: string
  check_in_time?: string
  check_out_time?: string
}

export interface PublicItinerary {
  title: string
  description: string
  start_date: string
  end_date: string
  cover_image_url: string
  expires_at: string
  days: PublicTripDay[]
  transportations: PublicTransportation[]
  accommodations: PublicAccommodation[]
}

// ── AI Daily Quota ──
export interface AutogenQuota {
  used: number
  limit: number
  remaining: number
  resets_at: string
  disabled?: boolean
}
