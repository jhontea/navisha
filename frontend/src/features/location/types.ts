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
}

export interface LocationSuggestionsResponse {
  suggestions: LocationSuggestion[]
}
