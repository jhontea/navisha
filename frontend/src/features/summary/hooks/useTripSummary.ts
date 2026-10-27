"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { useSyncExternalStore } from "react"

import { summaryApi } from "../api"
import type { SummaryLanguage } from "../types"

const summaryKey = (tripId: string) => ["summary", tripId] as const

// useTripSummary fetches the cached summary. No summary yet (204, or 404 from an
// older backend) is a normal empty state (null), so the card can show the
// initial "generate" prompt.
export function useTripSummary(tripId: string) {
  return useQuery({
    queryKey: summaryKey(tripId),
    queryFn: async () => {
      try {
        return (await summaryApi.get(tripId)) ?? null
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

// Used when storage is blocked (private mode): the choice still applies for
// this page, it just is not remembered.
let languageFallback: SummaryLanguage | null = null
const languageListeners = new Set<() => void>()

function readLanguage(): SummaryLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY)
    if (saved === "id" || saved === "en") return saved
  } catch {
    // Storage blocked; fall through.
  }
  return languageFallback ?? "id"
}

function subscribeLanguage(onChange: () => void) {
  languageListeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    languageListeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** The summary language this browser last picked (Indonesian by default). */
export function useSummaryLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, readLanguage, (): SummaryLanguage => "id")
  const choose = (next: SummaryLanguage) => {
    languageFallback = next
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Not remembered, still used for this generation.
    }
    languageListeners.forEach((listener) => listener())
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
