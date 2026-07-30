"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { tripApi } from "../api"
import type {
  CreateTripInput,
  GenerateTripInput,
  Day,
  TripDetail,
  TripDraft,
  UpdateTripInput,
  DashboardTripsResponse,
  TripListResponse,
} from "../types"
import type { TripOverviewResponse } from "../overview"
import type { InfiniteData } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"


const LIMIT = 20

export function useUpcomingTrips(limit = 6, enabled = true) {
  return useQuery({
    queryKey: ["trips", "upcoming", limit],
    queryFn: () => tripApi.listUpcoming(limit),
    staleTime: 2 * 60 * 1000,
    enabled,
  })
}

export function useFilteredTrips(from?: string, to?: string) {
  return useInfiniteQuery({
    queryKey: ["trips", "filtered", from ?? "", to ?? ""],
    queryFn: ({ pageParam }) =>
      tripApi.listFiltered({ cursor: pageParam, limit: 12, from, to }),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || undefined,
  })
}

export function useTrips(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["trips", "list"],
    queryFn: ({ pageParam }) =>
      tripApi.list({ cursor: pageParam, limit: LIMIT }),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || undefined,
    enabled,
  })
}

export function useDashboardTrips() {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ["trips", "dashboard"],
    queryFn: async () => {
      let dashboard: DashboardTripsResponse
      try {
        dashboard = await tripApi.dashboard()
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 501)) {
          throw error
        }
        const [upcoming, trips] = await Promise.all([
          tripApi.listUpcoming(6),
          tripApi.list({ limit: LIMIT }),
        ])
        dashboard = { upcoming, trips }
      }

      queryClient.setQueryData(["trips", "upcoming", 6], dashboard.upcoming)
      queryClient.setQueryData<InfiniteData<TripListResponse, string>>(
        ["trips", "list"],
        (current) => current
          ? {
              ...current,
              pages: [dashboard.trips, ...current.pages.slice(1)],
            }
          : { pages: [dashboard.trips], pageParams: [""] },
      )
      return dashboard
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  })
}

export function useTrip(id: string, enabled = true) {
  return useQuery({
    queryKey: ["trips", "detail", id],
    queryFn: () => tripApi.get(id),
    enabled: enabled && !!id,
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTripInput) => tripApi.create(input),
    onSuccess: () => {
      // Invalidate all trip list variants so dashboard + trips page update immediately
      qc.invalidateQueries({ queryKey: ["trips"], refetchType: 'active' })
    },
  })
}

export function useUpdateTrip(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTripInput) => tripApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<TripDetail>(["trips", "detail", id], (current) =>
        current ? { ...current, ...updated, days: current.days } : current,
      )
      qc.setQueryData<TripOverviewResponse>(["trips", "overview", id], (current) =>
        current ? { ...current, trip: { ...current.trip, ...updated, days: current.trip.days } } : current,
      )
      qc.invalidateQueries({ queryKey: ["trips", "upcoming"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["trips", "list"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["trips", "filtered"], refetchType: "none" })
      qc.invalidateQueries({ queryKey: ["trips", "dashboard"], refetchType: "active" })
      qc.invalidateQueries({ queryKey: ["summary", id], refetchType: "active" })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tripApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"], refetchType: 'active' })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI Generate Trip — Mutation Pattern (DO NOT REGRESS)
//
// ALWAYS use `mutate(input, { onSuccess, onError, onSettled })`
// NEVER use `await mutateAsync()` — causes shimmer-stuck-after-200 bug.
// retry: 0 + gcTime: 0 — no auto-retry, no stale mutation replay.
// See: /memories/navisha-frontend-patterns.md
//
// F5 — Auto-generate trip from a short prompt.
// useGenerateTripDraft calls the LLM (blocking, ~10-55s) and returns a draft.
// It does NOT persist; the user reviews the draft before committing.
export function useGenerateTripDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ["trips", "generate"],
    mutationFn: (input: GenerateTripInput) => tripApi.generate(input),
    retry: 0,
    gcTime: 0,
    // Quota decrements on every generate call — refresh the badge so the
    // user sees their remaining count update without a manual reload.
    onSettled: () => qc.invalidateQueries({ queryKey: ["autogen", "quota"] }),
  })
}

// useCreateTripFromDraft persists an approved draft (trip + days + activities).
export function useCreateTripFromDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { start_date: string; end_date: string; draft: TripDraft; cover_image_url?: string; description?: string }) =>
      tripApi.createFromDraft(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"], refetchType: 'active' })
    },
  })
}

// Invalidates the parent trip detail so the inline day notes value stays

// in sync with what we just persisted. tripId comes from the page that owns
// the DayPanel.
export function useUpdateDayNotes(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dayId, notes }: { dayId: string; notes: string }) =>
      tripApi.updateDayNotes(dayId, notes),
    onSuccess: (updated) => updateDayCaches(qc, tripId, updated),
  })
}

export function useUpdateDayTitle(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dayId, title }: { dayId: string; title: string }) =>
      tripApi.updateDayTitle(dayId, title),
    onSuccess: (updated) => updateDayCaches(qc, tripId, updated),
  })
}

function updateDayCaches(qc: ReturnType<typeof useQueryClient>, tripId: string, updated: Day) {
  const updateDays = (days: Day[]) => days.map((day) => (day.id === updated.id ? updated : day))
  qc.setQueryData<TripDetail>(["trips", "detail", tripId], (current) =>
    current ? { ...current, days: updateDays(current.days) } : current,
  )
  qc.setQueryData<TripOverviewResponse>(["trips", "overview", tripId], (current) =>
    current ? { ...current, trip: { ...current.trip, days: updateDays(current.trip.days) } } : current,
  )
}

// ── AI Daily Quota ──
// Shared across all AI features (generate trip, summary).
// No refetchInterval — polling every 60s wastes requests for users who aren't
// using AI. Instead, quota is invalidated on success of any AI mutation
// (useGenerateTripDraft, useGenerateSummary) so the badge refreshes only when
// it actually changes. staleTime 5min matches global default.
export function useAutogenQuota() {
  return useQuery({
    queryKey: ["autogen", "quota"],
    queryFn: () => tripApi.quota(),
    staleTime: 5 * 60 * 1000,
  })
}
