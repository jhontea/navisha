export type TransportationType =
  | "flight"
  | "bus"
  | "train"
  | "ferry"
  | "ship"
  | "car"
  | "other"

export const TRANSPORTATION_TYPES: TransportationType[] = [
  "flight",
  "bus",
  "train",
  "ferry",
  "ship",
  "car",
  "other",
]

export interface Transportation {
  id: string
  trip_id: string
  type: TransportationType
  label: string
  operator: string
  reference_number: string
  from_location: string
  to_location: string
  departure_datetime: string | null
  arrival_datetime: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface TransportationListResponse {
  items: Transportation[]
}

export interface CreateTransportationInput {
  type: TransportationType
  label?: string
  operator?: string
  reference_number?: string
  from_location?: string
  to_location?: string
  departure_datetime?: string | null
  arrival_datetime?: string | null
  notes?: string
}

export type UpdateTransportationInput = CreateTransportationInput
