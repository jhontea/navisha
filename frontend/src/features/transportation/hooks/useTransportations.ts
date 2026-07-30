"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { transportationApi } from "../api"
import type {
  CreateTransportationInput,
  TransportationListResponse,
  UpdateTransportationInput,
} from "../types"
import type { TripOverviewResponse } from "@/features/trip/overview"

const listKey = (tripId: string) =>
  ["transportations", "list", tripId] as const

const invalidateOverview = (qc: ReturnType<typeof useQueryClient>, tripId: string) =>
  qc.invalidateQueries({ queryKey: ["trips", "overview", tripId], refetchType: "active" })

export function useTransportations(tripId: string) {
  return useQuery({
    queryKey: listKey(tripId),
    queryFn: () => transportationApi.list(tripId),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTransportation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransportationInput) =>
      transportationApi.create(tripId, input),
    onSuccess: (created) => {
      qc.setQueryData<TransportationListResponse>(listKey(tripId), (current) => ({
        items: current ? [...current.items, created] : [created],
      }))
      updateOverviewCount(qc, tripId, 1)
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'active' })
      // Backend creates a linked expense when cost is provided — keep budget in sync
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'active' })
      invalidateOverview(qc, tripId)
    },
  })
}

export function useUpdateTransportation(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTransportationInput) =>
      transportationApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<TransportationListResponse>(listKey(tripId), (current) =>
        current ? { items: current.items.map((item) => item.id === updated.id ? updated : item) } : current,
      )
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'active' })
      invalidateOverview(qc, tripId)
    },
  })
}

export function useDeleteTransportation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transportationApi.delete(id),
    onSuccess: (_, deletedId) => {
      qc.setQueryData<TransportationListResponse>(listKey(tripId), (current) =>
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
      ? { ...current, transportation_count: Math.max(0, current.transportation_count + delta) }
      : current,
  )
}
