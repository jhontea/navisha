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

const listKey = (dayId: string) => ["activities", "list", dayId] as const

export function useActivities(dayId: string, enabled = true) {
  return useQuery({
    queryKey: listKey(dayId),
    queryFn: () => activityApi.list(dayId),
    enabled: enabled && !!dayId,
  })
}

export function useCreateActivity(dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateActivityInput) => activityApi.create(dayId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(dayId) }),
  })
}

export function useUpdateActivity(id: string, dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateActivityInput) => activityApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(dayId) }),
  })
}

export function useDeleteActivity(dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activityApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey(dayId) }),
  })
}

export function useReorderActivities(dayId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReorderInput) => activityApi.reorder(dayId, input),
    // Optimistic: rearrange the cache immediately so the card doesn't snap
    // back while the request is in flight.
    onMutate: async ({ ids }) => {
      await qc.cancelQueries({ queryKey: listKey(dayId) })
      const prev = qc.getQueryData<ActivityListResponse>(listKey(dayId))
      if (prev) {
        const map = new Map(prev.items.map((a) => [a.id, a]))
        const reordered = ids
          .map((id) => map.get(id))
          .filter((a): a is NonNullable<typeof a> => !!a)
        qc.setQueryData<ActivityListResponse>(listKey(dayId), {
          items: reordered,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(listKey(dayId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: listKey(dayId) }),
  })
}
