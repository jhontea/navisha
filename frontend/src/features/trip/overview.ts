"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { AccommodationListResponse } from "@/features/accommodation/types"
import type { TripActivityListResponse } from "@/features/activity/types"
import type { ExpenseSummary } from "@/features/expense/types"
import type { TransportationListResponse } from "@/features/transportation/types"
import type { TripDetail } from "./types"

export interface TripOverviewResponse {
  trip: TripDetail
  activities: TripActivityListResponse
  accommodations: AccommodationListResponse
  transportations: TransportationListResponse
  expense_summary: ExpenseSummary
}

export const tripOverviewKey = (tripId: string) => ["trips", "overview", tripId] as const

export const tripOverviewApi = {
  get: (tripId: string, signal?: AbortSignal) =>
    api.get<TripOverviewResponse>(`/trips/${tripId}/overview`, { signal }),
}

export function useTripOverview(tripId: string, enabled = true) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: tripOverviewKey(tripId),
    queryFn: async ({ signal }) => {
      const overview = await tripOverviewApi.get(tripId, signal)

      // Seed the existing domain caches so moving to another tab reuses the
      // aggregate response instead of immediately requesting the same data.
      queryClient.setQueryData(["trips", "detail", tripId], overview.trip)
      queryClient.setQueryData(["activities", "trip", tripId], overview.activities)
      queryClient.setQueryData(["accommodations", "list", tripId], overview.accommodations)
      queryClient.setQueryData(["transportations", "list", tripId], overview.transportations)
      queryClient.setQueryData(["expenses", "summary", tripId], overview.expense_summary)

      return overview
    },
    enabled: enabled && Boolean(tripId),
    staleTime: 5 * 60 * 1000,
  })
}
