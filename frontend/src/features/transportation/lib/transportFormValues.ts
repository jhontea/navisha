import { z } from "zod"

import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency"
import { costPayload, type LinkedCost } from "@/lib/linkedCost"

import type { CreateTransportationInput, Transportation } from "../types"

/** Form state of TransportationForm and its conversion to and from the API shape. */

export const transportFormSchema = z
  .object({
    type: z.enum(["flight", "bus", "train", "ferry", "ship", "car", "other"]),
    label: z.string().max(120).optional(),
    operator: z.string().max(120).optional(),
    reference_number: z.string().max(120).optional(),
    from_location: z.string().min(1, "From location is required").max(200),
    to_location: z.string().min(1, "To location is required").max(200),
    departure_datetime: z.string().min(1, "Departure time is required"),
    arrival_datetime: z.string().optional(),
    notes: z.string().max(2000).optional(),
    amount: z.string().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .superRefine((values, context) => {
    if (values.arrival_datetime && values.departure_datetime && values.arrival_datetime < values.departure_datetime) {
      context.addIssue({ code: "custom", path: ["arrival_datetime"], message: "Arrival must be after departure" })
    }
  })

export type TransportFormValues = z.infer<typeof transportFormSchema>

/**
 * Stored datetime → `<input type="datetime-local">` value. Times are wall-clock
 * digits stored as UTC, so the zone suffix and seconds are dropped:
 * "2026-05-10T06:30:00+00:00" → "2026-05-10T06:30".
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.replace(/Z$|[+-]\d{2}:\d{2}$/, "").replace(/:\d{2}(\.\d+)?$/, "")
}

/**
 * `datetime-local` value → RFC3339 for the API (the backend requires a zone):
 * "2026-05-10T06:30" → "2026-05-10T06:30:00Z".
 */
export function fromLocalInput(local: string | undefined): string | null {
  if (!local) return null
  const withSec = local.length === 16 ? `${local}:00` : local
  return withSec.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(withSec) ? withSec : `${withSec}Z`
}

export function transportFormDefaults(
  initial: Transportation | undefined,
  currency: CurrencyCode,
  cost?: LinkedCost | null,
): TransportFormValues {
  return {
    type: initial?.type ?? "flight",
    label: initial?.label ?? "",
    operator: initial?.operator ?? "",
    reference_number: initial?.reference_number ?? "",
    from_location: initial?.from_location ?? "",
    to_location: initial?.to_location ?? "",
    departure_datetime: toLocalInput(initial?.departure_datetime),
    arrival_datetime: toLocalInput(initial?.arrival_datetime),
    notes: initial?.notes ?? "",
    amount: cost ? String(cost.amount) : "",
    currency: cost && SUPPORTED_CURRENCIES.includes(cost.currency as CurrencyCode) ? (cost.currency as CurrencyCode) : currency,
  }
}

/** The API input; see costPayload for when `cost` is sent. */
export function transportInput(v: TransportFormValues, costMode: "add" | "edit" | "off"): CreateTransportationInput {
  return {
    type: v.type,
    label: v.label,
    operator: v.operator,
    reference_number: v.reference_number,
    from_location: v.from_location,
    to_location: v.to_location,
    departure_datetime: fromLocalInput(v.departure_datetime),
    arrival_datetime: fromLocalInput(v.arrival_datetime),
    notes: v.notes,
    cost: costPayload(v.amount, v.currency, costMode),
  }
}
