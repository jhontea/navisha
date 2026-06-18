export interface Accommodation {
  id: string
  trip_id: string
  name: string
  location_name: string
  lat: number | null
  lng: number | null
  google_place_id: string
  check_in: string // YYYY-MM-DD
  check_out: string
  confirmation_number: string
  notes: string
  created_at: string
  updated_at: string
}

export interface AccommodationListResponse {
  items: Accommodation[]
}

export interface CostInput {
  amount: number
  currency: string
}

export interface CreateAccommodationInput {
  name: string
  location_name?: string
  lat?: number | null
  lng?: number | null
  google_place_id?: string
  check_in: string
  check_out: string
  confirmation_number?: string
  notes?: string
  cost?: CostInput | null
}

export type UpdateAccommodationInput = CreateAccommodationInput
