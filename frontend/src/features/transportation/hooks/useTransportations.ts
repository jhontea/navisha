"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { transportationApi } from "../api"
import type {
  CreateTransportationInput,
  UpdateTransportationInput,
} from "../types"

const listKey = (tripId: string) =>
  ["transportations", "list", tripId] as const

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'all' })
      // Backend creates a linked expense when cost is provided — keep budget in sync
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'all' })
    },
  })
}

export function useUpdateTransportation(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTransportationInput) =>
      transportationApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'all' })
    },
  })
}

export function useDeleteTransportation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transportationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(tripId), refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId], refetchType: 'all' })
    },
  })
}
