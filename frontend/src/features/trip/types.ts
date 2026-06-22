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
