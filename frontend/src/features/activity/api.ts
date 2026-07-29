import { api } from "@/lib/api"
import type {
  Activity,
  ActivityListResponse,
  TripActivityListResponse,
  CreateActivityInput,
  ReorderInput,
  UpdateActivityInput,
} from "./types"

export const activityApi = {
  list: (dayId: string, signal?: AbortSignal) =>
    api.get<ActivityListResponse>(`/days/${dayId}/activities`, { signal }),

  listByTrip: (tripId: string, signal?: AbortSignal) =>
    api.get<TripActivityListResponse>(`/trips/${tripId}/activities`, { signal }),

  create: (dayId: string, input: CreateActivityInput) =>
    api.post<Activity>(`/days/${dayId}/activities`, input),

  update: (id: string, input: UpdateActivityInput) =>
    api.put<Activity>(`/activities/${id}`, input),

  delete: (id: string) => api.delete<void>(`/activities/${id}`),

  reorder: (dayId: string, input: ReorderInput) =>
    api.put<void>(`/days/${dayId}/activities/reorder`, input),
}
