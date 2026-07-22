import { api } from "@/lib/api"
import type {
  CreateTripInput,
  Day,
  GenerateTripInput,
  GenerateTripResponse,
  Trip,
  TripDetail,
  TripDraft,
  TripListResponse,
  UpdateTripInput,
  DayPreview,
  ShareDurationDays,
  TripShareLink,
} from "./types"


export const tripApi = {
  listUpcoming: (limit = 6) =>
    api.get<{ items: Trip[] }>("/trips/upcoming", { params: { limit: String(limit) } }),

  listFiltered: (params: { cursor?: string; limit?: number; from?: string; to?: string } = {}) => {
    const query: Record<string, string> = {}
    if (params.cursor) query.cursor = params.cursor
    if (params.limit) query.limit = String(params.limit)
    if (params.from) query.from = params.from
    if (params.to) query.to = params.to
    return api.get<TripListResponse>("/trips/filter", { params: query })
  },

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

  updateDayTitle: (dayId: string, title: string) =>
    api.put<Day>(`/days/${dayId}/title`, { title }),

  // F5 — Auto-generate
  generate: (input: GenerateTripInput) =>
    api.post<GenerateTripResponse>("/trips/generate", input),

  createFromDraft: (params: { start_date: string; end_date: string; draft: TripDraft; cover_image_url?: string; description?: string }) =>
    api.post<{ trip_id: string }>("/trips/from-draft", params),

  generateDayPreview: (tripId: string, dayId: string, instruction = "") =>
    api.post<DayPreview>(`/trips/${tripId}/days/${dayId}/generate-preview`, { instruction }),

  createShareLink: (tripId: string, durationDays: ShareDurationDays) =>
    api.post<TripShareLink>(`/trips/${tripId}/share-links`, { duration_days: durationDays }),

  getActiveShareLink: (tripId: string) =>
    api.get<TripShareLink>(`/trips/${tripId}/share-links/active`),

  revokeShareLink: (tripId: string) =>
    api.delete<void>(`/trips/${tripId}/share-links/active`),
}
