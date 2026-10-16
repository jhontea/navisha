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
import { insertAtOrderIndex, isSortedByStartTime, sortByStartTime } from "../lib/order"

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
      // The server slots it in by start time, shifting later activities.
      qc.setQueryData<ActivityListResponse>(listKey(dayId), (current) => ({
        items: current ? insertAtOrderIndex(current.items, created) : [created],
      }))
      qc.invalidateQueries({ queryKey: listKey(dayId), refetchType: "active" })
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

/** "Sort by time" for a day: reorders its activities by start time. */
export function useSortDayByTime(dayId: string, tripId: string) {
  const qc = useQueryClient()
  const { data } = useActivities(dayId)
  const reorder = useReorderActivities(dayId, tripId)
  const items = data?.items ?? []
  return {
    canSort: items.length > 1 && !isSortedByStartTime(items),
    isPending: reorder.isPending,
    sort: () => {
      const sorted = sortByStartTime(items)
      qc.setQueryData<ActivityListResponse>(listKey(dayId), { items: sorted })
      return reorder.mutateAsync({ ids: sorted.map((a) => a.id) })
    },
  }
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
