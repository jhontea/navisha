import { api } from "@/lib/api"
import type {
  Activity,
  ActivityListResponse,
  CreateActivityInput,
  ReorderInput,
  UpdateActivityInput,
} from "./types"

export const activityApi = {
  list: (dayId: string) =>
    api.get<ActivityListResponse>(`/days/${dayId}/activities`, {
      params: { _t: String(Date.now()) },
    }),

  create: (dayId: string, input: CreateActivityInput) =>
    api.post<Activity>(`/days/${dayId}/activities`, input),

  update: (id: string, input: UpdateActivityInput) =>
    api.put<Activity>(`/activities/${id}`, input),

  delete: (id: string) => api.delete<void>(`/activities/${id}`),

  reorder: (dayId: string, input: ReorderInput) =>
    api.put<void>(`/days/${dayId}/activities/reorder`, input),
}
