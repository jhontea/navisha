export type LocationProviderName = "geoapify" | "google"
export type LocationSearchKind = "place" | "region"

export interface LocationSuggestion {
  provider: LocationProviderName
  external_id: string
  name: string
  description: string
  country_code: string
  lat: number
  lng: number
  /** Original Google Maps link when the suggestion came from a pasted URL. */
  source_url?: string
  /** Provider result kind (amenity, building, street, city, ...). */
  result_type?: string
  /** True when the search was limited to the place's city. */
  near_city?: boolean
}

export interface LocationSuggestionsResponse {
  suggestions: LocationSuggestion[]
}

export interface BatchLocationSuggestionsResponse {
  results: Record<string, LocationSuggestion[]>
}

export interface MapsLinkResponse {
  suggestion: LocationSuggestion
}
