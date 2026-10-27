"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { TravelLeg } from "../lib/travel"

export interface TripTravelDay {
  day_id: string
  date: string // YYYY-MM-DD
  legs: TravelLeg[]
}

export const tripTravelKey = (tripId: string) => ["trips", "travel", tripId] as const

export const tripTravelApi = {
  get: (tripId: string, signal?: AbortSignal) =>
    api.get<{ days: TripTravelDay[] }>(`/trips/${tripId}/travel-times`, { signal }),
}

/** Travel times between consecutive located timeline entries, per day. */
export function useTripTravel(tripId: string) {
  return useQuery({
    queryKey: tripTravelKey(tripId),
    queryFn: ({ signal }) => tripTravelApi.get(tripId, signal),
    enabled: Boolean(tripId),
    staleTime: 60 * 60 * 1000,
    // Travel times are decorative: a failure just hides the connectors.
    retry: false,
  })
}
