"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { useEffect, useState } from "react"

import { summaryApi } from "../api"
import type { SummaryLanguage } from "../types"

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
    // Freshness is a cheap metadata comparison on the backend. Always check
    // again when returning to Overview so edits made in other trip sections
    // surface the outdated state immediately.
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useGenerateSummary(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (language: SummaryLanguage) => summaryApi.generate(tripId, language),
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

const LANGUAGE_KEY = "navisha:summary-language"

/** The summary language this browser last picked (Indonesian by default). */
export function useSummaryLanguage() {
  const [language, setLanguage] = useState<SummaryLanguage>("id")
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      if (saved === "id" || saved === "en") setLanguage(saved)
    } catch {
      // Storage blocked (private mode); keep the default.
    }
  }, [])
  const choose = (next: SummaryLanguage) => {
    setLanguage(next)
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Not remembered, still used for this generation.
    }
  }
  return [language, choose] as const
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
