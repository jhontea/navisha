"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ExpenseSummary } from "@/features/expense/types"
import type { TripDetail } from "./types"

export interface TripOverviewResponse {
  trip: TripDetail
  activity_count_by_day: Record<string, number>
  accommodation_count: number
  transportation_count: number
  expense_summary: ExpenseSummary
}

export const tripOverviewKey = (tripId: string) => ["trips", "overview", tripId] as const

export const tripOverviewApi = {
  get: (tripId: string, signal?: AbortSignal) =>
    api.get<TripOverviewResponse>(`/trips/${tripId}/overview`, { signal, cache: "no-cache" }),
}

export function useTripOverview(tripId: string, enabled = true) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: tripOverviewKey(tripId),
    queryFn: async ({ signal }) => {
      const overview = await tripOverviewApi.get(tripId, signal)

      // The compact overview response can safely seed the shared trip and
      // expense-summary caches without retaining large domain payloads.
      queryClient.setQueryData(["trips", "detail", tripId], overview.trip)
      queryClient.setQueryData(["expenses", "summary", tripId], overview.expense_summary)

      return overview
    },
    enabled: enabled && Boolean(tripId),
    staleTime: 5 * 60 * 1000,
  })
}
