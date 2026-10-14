"use client"

import { locationProvider, type PlaceSearchProps } from "@/features/location/provider"

export type { PlaceData } from "@/features/location/provider"

/** Place search field, backed by the configured location provider. */
export function LocationAutocomplete(props: PlaceSearchProps) {
  const { PlaceSearch } = locationProvider
  return <PlaceSearch {...props} />
}
