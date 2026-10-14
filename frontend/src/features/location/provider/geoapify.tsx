"use client"

import type { ReactNode } from "react"

import { resolveLocationSuggestions, searchLocationSuggestions } from "../api"
import { GeoapifyAutocomplete } from "../components/GeoapifyAutocomplete"
import type { PlaceCandidate } from "../placeMatching"
import type { LocationSuggestion } from "../types"
import type { DestinationSearchProps, LocationProvider, PlaceSearchProps } from "./types"

function PlaceSearch(props: PlaceSearchProps) {
  return (
    <GeoapifyAutocomplete
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      id={props.id}
      disabled={props.disabled}
      ariaInvalid={props.ariaInvalid}
      ariaDescribedBy={props.ariaDescribedBy}
      ariaLabel={props.ariaLabel}
      ariaRequired={props.ariaRequired}
      searchContext={props.searchContext}
      kind="place"
      className="rounded-xl border border-input bg-card px-4 py-2 text-base focus:border-primary focus:outline-none"
      onSelect={(suggestion) =>
        props.onPlaceSelect({
          location_name: suggestion.name,
          address: suggestion.description,
          lat: suggestion.lat,
          lng: suggestion.lng,
          google_place_id: suggestion.external_id,
        })
      }
    />
  )
}

function DestinationSearch(props: DestinationSearchProps) {
  return (
    <GeoapifyAutocomplete
      {...props}
      kind="region"
      onSelect={(suggestion) =>
        props.onSelect({
          description: suggestion.description,
          name: suggestion.name,
          countryCode: suggestion.country_code,
        })
      }
    />
  )
}

const REGION_RESULT_TYPES = new Set(["city", "county", "state", "country", "district", "suburb"])

function toCandidate(suggestion: LocationSuggestion): PlaceCandidate {
  return {
    name: suggestion.name,
    description: suggestion.description,
    lat: suggestion.lat,
    lng: suggestion.lng,
    externalId: suggestion.external_id,
    resultType: suggestion.result_type,
    nearCity: suggestion.near_city,
  }
}

/** Geoapify, called through our backend (/locations/*); the default provider. */
export const geoapifyLocationProvider: LocationProvider = {
  name: "geoapify",
  Boundary: ({ children }: { children: ReactNode }) => children,
  PlaceSearch,
  DestinationSearch,

  async resolveDestination(destination) {
    try {
      const response = await searchLocationSuggestions(destination, "region")
      // Only an area can be a trip destination; a street or a shop that
      // happens to share the name ("Gang Umroh") is not.
      const area = response.suggestions.find((s) => !s.result_type || REGION_RESULT_TYPES.has(s.result_type))
      return { description: area?.description ?? destination }
    } catch {
      return { description: destination }
    }
  },

  async findPlaceCandidates(queries, destination) {
    const response = await resolveLocationSuggestions(
      queries.map(({ key, name, altName, city }) => ({ key, name, alt_name: altName, city })),
      destination,
    )
    return Object.fromEntries(
      queries.map(({ key }) => [key, (response.results[key] ?? []).map(toCandidate)]),
    )
  },
}
