"use client"

import { locationProvider, type DestinationSearchProps } from "@/features/location/provider"

export type { DestinationData } from "@/features/location/provider"

/** City / region / country search field, backed by the configured location provider. */
export function DestinationAutocomplete(props: DestinationSearchProps) {
  const { DestinationSearch } = locationProvider
  return <DestinationSearch {...props} />
}
