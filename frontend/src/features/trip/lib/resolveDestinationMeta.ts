// Resolve an AI-generated destination to the provider's canonical address.

import { locationProvider } from "@/features/location/provider"

export interface DestinationMeta {
  description: string
}

export async function resolveDestinationMeta(destination: string): Promise<DestinationMeta | null> {
  if (!destination) return null
  return locationProvider.resolveDestination(destination)
}
