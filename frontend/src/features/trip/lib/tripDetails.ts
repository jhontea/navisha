import type {
  GenerateEvent,
  GeneratePlace,
  GenerateTravelers,
  GenerateTripInput,
  TransportMode,
  TripNeed,
} from "../types"

// Limits mirror backend/internal/autogen (model.go, validate.go).
export const MAX_DESCRIPTION = 500
export const MAX_PLACE_LABEL = 200
export const MAX_EVENT_NAME = 100
export const MAX_ADULTS = 20
export const MAX_CHILDREN = 10

export const TRANSPORT_MODES: { value: TransportMode; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "train", label: "Train" },
  { value: "plane", label: "Plane" },
  { value: "bus", label: "Bus" },
]

export const TRIP_NEEDS: { value: TripNeed; label: string }[] = [
  { value: "hotel_near_venue", label: "Hotel near the venue" },
  { value: "kids_playground", label: "Kids playground" },
  { value: "food_near_venue", label: "Food near the venue" },
  { value: "easy_parking", label: "Easy parking" },
]

/** A typed place plus the suggestion the user picked for it, if any. */
export interface PlaceField {
  text: string
  picked: GeneratePlace | null
}

/** The optional "trip details" step of the generate wizard. */
export interface TripDetailsForm {
  origin: PlaceField
  transportMode: TransportMode | ""
  eventName: string
  venue: PlaceField
  eventDate: string
  eventStart: string
  eventEnd: string
  /** "" = not given. */
  adults: string
  children: number
  childAges: string[]
  needs: TripNeed[]
}

export function emptyTripDetails(eventDate = ""): TripDetailsForm {
  return {
    origin: { text: "", picked: null },
    transportMode: "",
    eventName: "",
    venue: { text: "", picked: null },
    eventDate,
    eventStart: "",
    eventEnd: "",
    adults: "",
    children: 0,
    childAges: [],
    needs: [],
  }
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** The place sent to the API: the picked suggestion if the text still matches it, else the typed text. */
export function toPlace(field: PlaceField): GeneratePlace | undefined {
  const text = field.text.trim()
  if (!text) return undefined
  if (field.picked && field.picked.label === text) return field.picked
  return { label: text }
}

/** Resizes the child-age list to the number of children, keeping entered ages. */
export function withChildren(form: TripDetailsForm, children: number): TripDetailsForm {
  const n = Math.max(0, Math.min(MAX_CHILDREN, children))
  const childAges = Array.from({ length: n }, (_, i) => form.childAges[i] ?? "")
  return { ...form, children: n, childAges }
}

function hasEventInput(f: TripDetailsForm): boolean {
  return Boolean(f.eventName.trim() || f.venue.text.trim() || f.eventStart || f.eventEnd)
}

/**
 * Returns the first problem with the details step, or null when it can be
 * sent. The event is all-or-nothing: once any of its fields is filled, every
 * field is required and the date must fall inside the trip.
 */
export function validateTripDetails(f: TripDetailsForm, startDate: string, endDate: string): string | null {
  if (f.origin.text.trim().length > MAX_PLACE_LABEL) return `Starting point is too long (max ${MAX_PLACE_LABEL}).`
  if (hasEventInput(f)) {
    if (!f.eventName.trim()) return "Add the event name."
    if (f.eventName.trim().length > MAX_EVENT_NAME) return `Event name is too long (max ${MAX_EVENT_NAME}).`
    if (!f.venue.text.trim()) return "Add the event venue."
    if (f.venue.text.trim().length > MAX_PLACE_LABEL) return `Venue is too long (max ${MAX_PLACE_LABEL}).`
    if (!f.eventDate) return "Pick the event date."
    if (f.eventDate < startDate || f.eventDate > endDate) return "The event date must be within your trip dates."
    if (!TIME_RE.test(f.eventStart) || !TIME_RE.test(f.eventEnd)) return "Add the event start and end times."
    if (f.eventEnd <= f.eventStart) return "The event must end after it starts."
  }
  if (f.adults !== "" || f.children > 0) {
    const adults = Number(f.adults)
    if (!Number.isInteger(adults) || adults < 1 || adults > MAX_ADULTS) {
      return `Number of adults must be 1–${MAX_ADULTS}.`
    }
    for (const age of f.childAges) {
      const n = Number(age)
      if (age === "" || !Number.isInteger(n) || n < 0 || n > 17) return "Give each child's age (0–17)."
    }
  }
  return null
}

/** Builds the optional event-trip fields of GenerateTripInput (only the ones given). */
export function tripDetailsToInput(f: TripDetailsForm): Partial<GenerateTripInput> {
  const out: Partial<GenerateTripInput> = {}
  const origin = toPlace(f.origin)
  if (origin) out.origin = origin
  if (f.transportMode) out.transport_mode = f.transportMode
  if (hasEventInput(f)) {
    const event: GenerateEvent = {
      name: f.eventName.trim(),
      venue: toPlace(f.venue) ?? { label: f.venue.text.trim() },
      date: f.eventDate,
      start_time: f.eventStart,
      end_time: f.eventEnd,
    }
    out.event = event
  }
  if (f.adults !== "" || f.children > 0) {
    const travelers: GenerateTravelers = {
      adults: Number(f.adults),
      children: f.children,
      child_ages: f.childAges.map(Number),
    }
    out.travelers = travelers
  }
  if (f.needs.length > 0) out.needs = [...f.needs]
  return out
}

/** One-line recap rows for the review step. */
export function tripDetailsRecap(f: TripDetailsForm): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const input = tripDetailsToInput(f)
  if (input.origin) {
    const mode = TRANSPORT_MODES.find((m) => m.value === input.transport_mode)?.label
    rows.push({ label: "From", value: mode ? `${input.origin.label} · ${mode}` : input.origin.label })
  } else if (input.transport_mode) {
    rows.push({ label: "Transport", value: TRANSPORT_MODES.find((m) => m.value === input.transport_mode)!.label })
  }
  if (input.event) {
    const e = input.event
    rows.push({ label: "Event", value: `${e.name} · ${e.venue.label} · ${e.date} ${e.start_time}–${e.end_time}` })
  }
  if (input.travelers) {
    const t = input.travelers
    const kids = t.children > 0 ? `, ${t.children} child${t.children > 1 ? "ren" : ""} (${t.child_ages.join(", ")} y)` : ""
    rows.push({ label: "Travelers", value: `${t.adults} adult${t.adults > 1 ? "s" : ""}${kids}` })
  }
  if (input.needs) {
    rows.push({
      label: "Needs",
      value: input.needs.map((n) => TRIP_NEEDS.find((x) => x.value === n)!.label).join(", "),
    })
  }
  return rows
}

/**
 * Parses the optional budget field. Returns undefined for blank, the amount
 * for a valid non-negative number, or null when the text is not a number.
 */
export function parseBudget(text: string): number | undefined | null {
  const cleaned = text.replace(/[\s.,]/g, "")
  if (!cleaned) return undefined
  if (!/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}
