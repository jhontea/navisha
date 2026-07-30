"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { activityApi } from "../api"
import type {
  ActivityListResponse,
  CreateActivityInput,
  ReorderInput,
  UpdateActivityInput,
} from "../types"
import type { TripOverviewResponse } from "@/features/trip/overview"

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

function invalidateActivityViews(
  qc: ReturnType<typeof useQueryClient>,
  dayId: string,
  tripId: string,
) {
  qc.invalidateQueries({ queryKey: ["activities", "trip", tripId], refetchType: "active" })
  qc.invalidateQueries({ queryKey: ["trips", "overview", tripId], refetchType: "none" })
}

export function useCreateActivity(dayId: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateActivityInput) => activityApi.create(dayId, input),
    onSuccess: (created) => {
      qc.setQueryData<ActivityListResponse>(listKey(dayId), (current) => ({
        items: current ? [...current.items, created] : [created],
      }))
      updateOverviewActivityCount(qc, tripId, dayId, 1)
      invalidateActivityViews(qc, dayId, tripId)
    },
  })
}

export function useUpdateActivity(id: string, dayId: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateActivityInput) => activityApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<ActivityListResponse>(listKey(dayId), (current) =>
        current ? { items: current.items.map((item) => item.id === updated.id ? updated : item) } : current,
      )
      invalidateActivityViews(qc, dayId, tripId)
    },
  })
}

export function useDeleteActivity(dayId: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activityApi.delete(id),
    onSuccess: (_, deletedId) => {
      qc.setQueryData<ActivityListResponse>(listKey(dayId), (current) =>
        current ? { items: current.items.filter((item) => item.id !== deletedId) } : current,
      )
      updateOverviewActivityCount(qc, tripId, dayId, -1)
      invalidateActivityViews(qc, dayId, tripId)
    },
  })
}

export function useReorderActivities(dayId: string, tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReorderInput) => activityApi.reorder(dayId, input),
    // Optimistic update is handled directly in DayActivities.onDragEnd
    // via qc.setQueryData — faster and bypasses TanStack Mutation lifecycle.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: listKey(dayId), refetchType: "active" })
      invalidateActivityViews(qc, dayId, tripId)
    },
  })
}

function updateOverviewActivityCount(
  qc: ReturnType<typeof useQueryClient>,
  tripId: string,
  dayId: string,
  delta: number,
) {
  qc.setQueryData<TripOverviewResponse>(["trips", "overview", tripId], (current) =>
    current
      ? {
          ...current,
          activity_count_by_day: {
            ...current.activity_count_by_day,
            [dayId]: Math.max(0, (current.activity_count_by_day[dayId] ?? 0) + delta),
          },
        }
      : current,
  )
}
