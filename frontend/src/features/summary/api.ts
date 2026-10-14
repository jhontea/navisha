import { api } from "@/lib/api"
import type { SummaryLanguage, TripSummary } from "./types"

export const summaryApi = {
  get: (tripId: string) => api.get<TripSummary>(`/trips/${tripId}/summary`),

  generate: (tripId: string, language: SummaryLanguage) =>
    api.post<TripSummary>(`/trips/${tripId}/summary`, { language }),

  delete: (tripId: string) => api.delete<void>(`/trips/${tripId}/summary`),
}
