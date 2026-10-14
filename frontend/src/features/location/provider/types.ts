import type { ComponentType, ReactNode } from "react"

import type { PlaceCandidate } from "../placeMatching"
import type { LocationProviderName } from "../types"

/** A place picked in the activity / stay / transport location field. */
export interface PlaceData {
  location_name: string
  address: string
  lat: number
  lng: number
  google_place_id: string
  /** Original Google Maps link when the place came from a pasted URL. */
  source_url?: string
}

export interface PlaceSearchProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceData) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  ariaLabel?: string
  ariaRequired?: boolean
  /** Bias results toward this area (the trip destination). */
  searchContext?: string
}

/** A trip destination picked in the trip form. */
export interface DestinationData {
  /** Human-readable destination, e.g. "Tokyo, Japan". */
  description: string
  /** Short name of the selected place, e.g. "Tokyo". */
  name: string
  /** ISO country code, e.g. "JP" (empty if unavailable). */
  countryCode: string
}

export interface DestinationSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect: (place: DestinationData) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

/** One place name to look up, with a key to match the results back. */
export interface PlaceQuery {
  key: string
  name: string
}

/**
 * Everything the app needs from a place search service. Geoapify (default,
 * through our backend) and Google Places both implement it; feature code only
 * talks to `locationProvider` from ./index.
 */
export interface LocationProvider {
  name: LocationProviderName
  /** Wraps a subtree that calls the provider from the browser (loads scripts). */
  Boundary: ComponentType<{ children: ReactNode }>
  /** Search field for a specific place. */
  PlaceSearch: ComponentType<PlaceSearchProps>
  /** Search field for a city, region or country. */
  DestinationSearch: ComponentType<DestinationSearchProps>
  /** Canonical description for a free-text destination, or null when unavailable. */
  resolveDestination(destination: string): Promise<{ description: string } | null>
  /** Candidates per query key, searched near the destination. */
  findPlaceCandidates(queries: PlaceQuery[], destination: string): Promise<Record<string, PlaceCandidate[]>>
  /**
   * Optional wider search without the destination bias, used only for a
   * near-exact name (e.g. an airport outside the destination city).
   */
  findPlaceCandidatesGlobally?(queries: PlaceQuery[]): Promise<Record<string, PlaceCandidate[]>>
}
