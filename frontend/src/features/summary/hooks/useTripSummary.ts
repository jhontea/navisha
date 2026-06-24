"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { summaryApi } from "../api"

const summaryKey = (tripId: string) => ["summary", tripId] as const

// useTripSummary fetches the cached summary. A 404 (no summary yet) is treated
// as a normal empty state (null) rather than an error, so the card can show
// the initial "generate" prompt.
export function useTripSummary(tripId: string) {
  return useQuery({
    queryKey: summaryKey(tripId),
    queryFn: async () => {
      try {
        return await summaryApi.get(tripId)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null
        }
        throw err
      }
    },
    enabled: !!tripId,
    retry: false,
  })
}

export function useGenerateSummary(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => summaryApi.generate(tripId),
    onSuccess: (data) => {
      qc.setQueryData(summaryKey(tripId), data)
    },
  })
}

export function useDeleteSummary(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => summaryApi.delete(tripId),
    onSuccess: () => {
      qc.setQueryData(summaryKey(tripId), null)
    },
  })
}
