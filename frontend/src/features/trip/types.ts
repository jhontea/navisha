export interface Trip {
  id: string
  user_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  base_currency: string
  budget: number
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

export interface CreateTripInput {
  title: string
  description?: string
  start_date: string // YYYY-MM-DD
  end_date: string
  base_currency: string
  budget?: number
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
}

export interface ActivityDraft {
  type: "location" | "note"
  title: string
  start_time: string
  end_time: string
  location_name: string
  address: string
  lat: number | null
  lng: number | null
  google_place_id: string
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
}

export interface PublicTripActivity {
  id: string
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
