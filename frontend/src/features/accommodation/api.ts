import { api } from "@/lib/api"
import type {
  Accommodation,
  AccommodationListResponse,
  CreateAccommodationInput,
  UpdateAccommodationInput,
} from "./types"

export const accommodationApi = {
  list: (tripId: string) =>
    api.get<AccommodationListResponse>(`/trips/${tripId}/accommodations`),

  create: (tripId: string, input: CreateAccommodationInput) =>
    api.post<Accommodation>(`/trips/${tripId}/accommodations`, input),

  update: (id: string, input: UpdateAccommodationInput) =>
    api.put<Accommodation>(`/accommodations/${id}`, input),

  delete: (id: string) => api.delete<void>(`/accommodations/${id}`),
}
