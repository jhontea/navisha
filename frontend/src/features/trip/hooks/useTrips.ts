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
  TripDraft,
  UpdateTripInput,
} from "../types"


const LIMIT = 20

export function useUpcomingTrips(limit = 6) {
  return useQuery({
    queryKey: ["trips", "upcoming", limit],
    queryFn: () => tripApi.listUpcoming(limit),
    staleTime: 2 * 60 * 1000,
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

export function useTrips() {
  return useInfiniteQuery({
    queryKey: ["trips", "list"],
    queryFn: ({ pageParam }) =>
      tripApi.list({ cursor: pageParam, limit: LIMIT }),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || undefined,
  })
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ["trips", "detail", id],
    queryFn: () => tripApi.get(id),
    enabled: !!id,
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTripInput) => tripApi.create(input),
    onSuccess: () => {
      // Invalidate all trip list variants so dashboard + trips page update immediately
      qc.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

export function useUpdateTrip(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTripInput) => tripApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tripApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] })
    },
  })
}

// F5 — Auto-generate trip from a short prompt.
// useGenerateTripDraft calls the LLM (blocking, ~10-25s) and returns a draft.
// It does NOT persist; the user reviews the draft before committing.
export function useGenerateTripDraft() {
  return useMutation({
    mutationFn: (input: GenerateTripInput) => tripApi.generate(input),
  })
}

// useCreateTripFromDraft persists an approved draft (trip + days + activities).
export function useCreateTripFromDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { start_date: string; end_date: string; draft: TripDraft }) =>
      tripApi.createFromDraft(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] })
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["trips", "detail", tripId] }),
  })
}
