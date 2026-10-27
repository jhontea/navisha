export type AccommodationType = "hotel" | "hostel" | "apartment" | "other"

export const ACCOMMODATION_TYPES: AccommodationType[] = [
  "hotel",
  "hostel",
  "apartment",
  "other",
]

export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  hotel: "Hotel",
  hostel: "Hostel",
  apartment: "Apartment",
  other: "Other",
}

/** Times a stay sits at on the timeline when it has none of its own. */
export const DEFAULT_CHECK_IN_TIME = "14:00"
export const DEFAULT_CHECK_OUT_TIME = "12:00"

export interface Accommodation {
  id: string
  trip_id: string
  accommodation_type: AccommodationType
  name: string
  location_name: string
  lat: number | null
  lng: number | null
  google_place_id: string
  check_in: string // YYYY-MM-DD
  check_out: string
  /** "HH:MM"; null means the usual time (DEFAULT_CHECK_IN_TIME). */
  check_in_time: string | null
  /** "HH:MM"; null means the usual time (DEFAULT_CHECK_OUT_TIME). */
  check_out_time: string | null
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
  accommodation_type?: AccommodationType
  name: string
  location_name?: string
  lat?: number | null
  lng?: number | null
  google_place_id?: string
  check_in: string
  check_out: string
  check_in_time?: string | null
  check_out_time?: string | null
  confirmation_number?: string
  notes?: string
  cost?: CostInput | null
}

export type UpdateAccommodationInput = CreateAccommodationInput

/** A stay not yet saved, e.g. read from a pasted confirmation; accommodation_type is "" when unknown. */
export type StayDraft = Pick<
  Accommodation,
  "name" | "location_name" | "check_in" | "check_out" | "check_in_time" | "check_out_time" | "confirmation_number" | "notes"
> & { accommodation_type: AccommodationType | "" }
