import type { StayDraft } from "@/features/accommodation/types"
import type { TransportDraft } from "@/features/transportation/types"
import type { LinkedCost } from "@/lib/linkedCost"

/** One booking read from a pasted confirmation (POST /trips/:id/bookings/parse). Unknown fields are "" or null. */
export type ParsedBooking =
  | { kind: "transport"; transport: TransportDraft; cost: LinkedCost | null }
  | { kind: "stay"; stay: StayDraft; cost: LinkedCost | null }

export interface ParseBookingsResponse {
  bookings: ParsedBooking[]
}
