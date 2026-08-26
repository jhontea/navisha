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
