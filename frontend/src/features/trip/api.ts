import { api } from "@/lib/api"
import type {
  CreateTripInput,
  Day,
  Trip,
  TripDetail,
  TripListResponse,
  UpdateTripInput,
} from "./types"

export const tripApi = {
  list: (params: { cursor?: string; limit?: number } = {}) => {
    const query: Record<string, string> = {}
    if (params.cursor) query.cursor = params.cursor
    if (params.limit) query.limit = String(params.limit)
    return api.get<TripListResponse>("/trips", { params: query })
  },

  get: (id: string) => api.get<TripDetail>(`/trips/${id}`),

  create: (input: CreateTripInput) => api.post<Trip>("/trips", input),

  update: (id: string, input: UpdateTripInput) =>
    api.put<Trip>(`/trips/${id}`, input),

  delete: (id: string) => api.delete<void>(`/trips/${id}`),

  updateDayNotes: (dayId: string, notes: string) =>
    api.put<Day>(`/days/${dayId}/notes`, { notes }),
}
