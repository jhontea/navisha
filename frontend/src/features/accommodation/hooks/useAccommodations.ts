"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { accommodationApi } from "../api"
import type {
  CreateAccommodationInput,
  UpdateAccommodationInput,
} from "../types"

const listKey = (tripId: string) =>
  ["accommodations", "list", tripId] as const

export function useAccommodations(tripId: string) {
  return useQuery({
    queryKey: listKey(tripId),
    queryFn: () => accommodationApi.list(tripId),
    enabled: !!tripId,
  })
}

export function useCreateAccommodation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccommodationInput) =>
      accommodationApi.create(tripId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(tripId) })
      // Invalidate expense summary + list so budget page reflects new cost immediately
      qc.invalidateQueries({ queryKey: ["expenses", "summary", tripId] })
      qc.invalidateQueries({ queryKey: ["expenses", "list", tripId] })
    },
  })
}

export function useUpdateAccommodation(id: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAccommodationInput) =>
      accommodationApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(tripId) }),
  })
}

export function useDeleteAccommodation(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accommodationApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(tripId) }),
  })
}
