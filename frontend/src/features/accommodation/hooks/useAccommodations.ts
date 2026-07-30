"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { accommodationApi } from "../api"
import type {
  AccommodationListResponse,
  CreateAccommodationInput,
  UpdateAccommodationInput,
} from "../types"
import type { TripOverviewResponse } from "@/features/trip/overview"

const listKey = (tripId: string) =>
  ["accommodations", "list", tripId] as const

const invalidateOverview = (qc: ReturnType<typeof useQueryClient>, tripId: string) =>
  qc.invalidateQueries({ queryKey: ["trips", "overview", tripId], refetchType: "active" })

export function useAccommodations(tripId: string) {
  return useQuery({
    queryKey: listKey(tripId),
    queryFn: () => accommodationApi.list(tripId),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAccommodation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccommodationInput) =>
      accommodationApi.create(tripId, input),
    onSuccess: (created) => {
      qc.setQueryData<AccommodationListResponse>(listKey(tripId), (current) => ({
        items: current ? [...current.items, created] : [created],
      }))
      updateOverviewCount(qc, tripId, 1)
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'active' })
      // Invalidate expense summary + list so budget page reflects new cost immediately
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'active' })
      invalidateOverview(qc, tripId)
    },
  })
}

export function useUpdateAccommodation(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAccommodationInput) =>
      accommodationApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<AccommodationListResponse>(listKey(tripId), (current) =>
        current ? { items: current.items.map((item) => item.id === updated.id ? updated : item) } : current,
      )
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'active' })
      invalidateOverview(qc, tripId)
    },
  })
}

export function useDeleteAccommodation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accommodationApi.delete(id),
    onSuccess: (_, deletedId) => {
      qc.setQueryData<AccommodationListResponse>(listKey(tripId), (current) =>
        current ? { items: current.items.filter((item) => item.id !== deletedId) } : current,
      )
      updateOverviewCount(qc, tripId, -1)
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'active' })
      invalidateOverview(qc, tripId)
    },
  })
}

function updateOverviewCount(
  qc: ReturnType<typeof useQueryClient>,
  tripId: string,
  delta: number,
) {
  qc.setQueryData<TripOverviewResponse>(["trips", "overview", tripId], (current) =>
    current
      ? { ...current, accommodation_count: Math.max(0, current.accommodation_count + delta) }
      : current,
  )
}
