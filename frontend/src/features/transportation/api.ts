import { api } from "@/lib/api"
import type {
  CreateTransportationInput,
  Transportation,
  TransportationListResponse,
  UpdateTransportationInput,
} from "./types"

export const transportationApi = {
  list: (tripId: string) =>
    api.get<TransportationListResponse>(`/trips/${tripId}/transportations`),

  create: (tripId: string, input: CreateTransportationInput) =>
    api.post<Transportation>(`/trips/${tripId}/transportations`, input),

  update: (id: string, input: UpdateTransportationInput) =>
    api.put<Transportation>(`/transportations/${id}`, input),

  delete: (id: string) => api.delete<void>(`/transportations/${id}`),
}
