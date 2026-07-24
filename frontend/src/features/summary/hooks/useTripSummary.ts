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
    staleTime: 5 * 60 * 1000, // 5 min — don't refetch immediately after generate
  })
}

export function useGenerateSummary(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => summaryApi.generate(tripId),
    onSuccess: (data) => {
      qc.setQueryData(summaryKey(tripId), data)
      // Summary generation consumes the shared AI daily quota — refresh the
      // badge so the remaining count stays accurate.
      qc.invalidateQueries({ queryKey: ["autogen", "quota"] })
    },
    // Prevent double-generation: mutation must fully settle before retry.
    // TanStack Query already enforces one-at-a-time, but this is belt-and-suspenders.
    retry: 0,
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
