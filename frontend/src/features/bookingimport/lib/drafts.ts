import type { StayDraft } from "@/features/accommodation/types"
import type { TransportDraft } from "@/features/transportation/types"

/** Same max length as the form's schema, so AI output never blocks saving; never splits a surrogate pair. */
function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max).replace(/[\uD800-\uDBFF]$/, "")
}

/** Parsed transport → TransportationForm draft, clipped to transportFormSchema limits. */
export function transportDraft(t: TransportDraft): TransportDraft {
  return {
    ...t,
    label: clip(t.label, 120),
    operator: clip(t.operator, 120),
    reference_number: clip(t.reference_number, 120),
    from_location: clip(t.from_location, 200),
    to_location: clip(t.to_location, 200),
    notes: clip(t.notes, 2000),
  }
}

/** Parsed stay → AccommodationForm draft, clipped to its schema limits. */
export function stayDraft(s: StayDraft): StayDraft {
  return {
    ...s,
    name: clip(s.name, 200),
    location_name: clip(s.location_name, 200),
    confirmation_number: clip(s.confirmation_number, 120),
    notes: clip(s.notes, 2000),
  }
}
