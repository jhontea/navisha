"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { activityApi } from "../api"
import type {
  CreateActivityInput,
  ReorderInput,
  UpdateActivityInput,
} from "../types"

const listKey = (dayId: string) => ["activities", "list", dayId] as const

export function useActivities(dayId: string, enabled = true) {
  return useQuery({
    queryKey: listKey(dayId),
    queryFn: ({ signal }) => activityApi.list(dayId, signal),
    enabled: enabled && !!dayId,
    staleTime: 0, // always refetch — activities mutate frequently (reorder, add, delete)
    structuralSharing: false, // reorder changes item order; structuralSharing may suppress re-render
  })
}

export function useTripActivities(tripId: string) {
  return useQuery({
    queryKey: ["activities", "trip", tripId],
    queryFn: ({ signal }) => activityApi.listByTrip(tripId, signal),
    enabled: !!tripId,
  })
}

export function useCreateActivity(dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateActivityInput) => activityApi.create(dayId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"], refetchType: 'active' }),
  })
}

export function useUpdateActivity(id: string, _dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateActivityInput) => activityApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"], refetchType: 'active' }),
  })
}

export function useDeleteActivity(_dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activityApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"], refetchType: 'active' }),
  })
}

export function useReorderActivities(dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReorderInput) => activityApi.reorder(dayId, input),
    // Optimistic update is handled directly in DayActivities.onDragEnd
    // via qc.setQueryData — faster and bypasses TanStack Mutation lifecycle.
    onSettled: () => qc.invalidateQueries({ queryKey: ["activities"], refetchType: 'active' }),
  })
}
