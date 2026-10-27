import { api } from "@/lib/api"
import type { ParseBookingsResponse } from "./types"

export const bookingImportApi = {
  parse: (tripId: string, text: string) =>
    api.post<ParseBookingsResponse>(`/trips/${tripId}/bookings/parse`, { text }),
}
