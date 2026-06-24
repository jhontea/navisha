import { api } from "@/lib/api"
import type { TripSummary } from "./types"

export const summaryApi = {
  get: (tripId: string) => api.get<TripSummary>(`/trips/${tripId}/summary`),

  generate: (tripId: string) =>
    api.post<TripSummary>(`/trips/${tripId}/summary`),

  delete: (tripId: string) => api.delete<void>(`/trips/${tripId}/summary`),
}
