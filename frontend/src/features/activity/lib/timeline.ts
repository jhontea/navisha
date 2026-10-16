import type { Transportation } from "@/features/transportation/types"
import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME, type Accommodation } from "@/features/accommodation/types"
import type { Activity } from "../types"

/**
 * The transport and stay fields the timeline needs. Full API records satisfy
 * these, and so do the trimmed records on a public shared trip.
 */
export type TimelineTransport = Pick<
  Transportation,
  "id" | "label" | "operator" | "from_location" | "to_location" | "departure_datetime" | "arrival_datetime"
> & { type: string; reference_number?: string }
export type TimelineStay = Pick<Accommodation, "id" | "name" | "location_name" | "check_in" | "check_out"> & {
  confirmation_number?: string
  /** "HH:MM" set on the stay; overrides the guessed time. */
  check_in_time?: string | null
  check_out_time?: string | null
}

/** Read-only items shown on a day's timeline next to its activities. */
export type StaticTimelineItem<T extends TimelineTransport = Transportation, S extends TimelineStay = Accommodation> =
  | { kind: "transport"; data: T }
  | {
      kind: "accommodation"
      data: S
      event: "check_in" | "check_out"
      /** "HH:MM" the stay sorts at and shows on this day. */
      at?: string
    }

// Stays without times of their own sit at typical hotel times.
const CHECK_IN_TIME = DEFAULT_CHECK_IN_TIME
const CHECK_OUT_TIME = DEFAULT_CHECK_OUT_TIME

/**
 * Extract "HH:MM" literally from an ISO datetime string — no timezone conversion.
 * DB stores "2026-05-10T06:30:00+00:00". User entered 06:30 and expects to see 06:30.
 * So we read T<HH>:<MM> directly from the string.
 */
export function extractTime(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}

/**
 * Extract "YYYY-MM-DD" literally from a datetime string — no timezone conversion.
 * Reads the date portion before the T, so "2026-05-10T06:30:00+00:00" → "2026-05-10".
 */
export function extractDate(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** "HH:MM" sort key for a datetime or time string; missing values sort last. */
export function toSortKey(v: string | null | undefined): string {
  if (!v) return "99:99"
  if (v.includes("T")) {
    const t = extractTime(v)
    if (t) return t
  }
  return v
}

/** Whether a date ("YYYY-MM-DD") or datetime string falls on `date`. */
export function dateMatches(datetimeStr: string | null | undefined, date: string): boolean {
  if (!datetimeStr) return false
  if (datetimeStr.length === 10) return datetimeStr === date
  return extractDate(datetimeStr) === date
}

function staticSortKey(item: StaticTimelineItem<TimelineTransport, TimelineStay>): string {
  if (item.kind === "transport") return toSortKey(item.data.departure_datetime)
  return item.at ?? (item.event === "check_in" ? CHECK_IN_TIME : CHECK_OUT_TIME)
}

/** "HH:MM" moved by `minutes`, clamped to the same day. */
function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes))
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** Minutes since midnight of "HH:MM". */
function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/** Transport legs within this many minutes of each other are one journey. */
const CONNECTION_MINUTES = 180

/**
 * When a stay's check-in/out sorts on `date` if it has no time set. They sit
 * at typical hotel times (check-out 12:00, check-in 14:00), but never on the
 * wrong side of the day's travel:
 * - check-out comes before the first transport leaving that day;
 * - check-in comes after the day's first journey: a 10:00 flight landing at
 *   15:55 and a 17:30 transfer bus are one journey, so check-in follows the
 *   bus. A later, separate trip (an 18:00 flight after an 06:30 one) does not
 *   move it.
 */
function stayTimes(transportsToday: TimelineTransport[], date: string): { checkIn: string; checkOut: string } {
  const legs = transportsToday
    .map((t) => {
      const start = extractTime(t.departure_datetime)
      const end = dateMatches(t.arrival_datetime, date) ? extractTime(t.arrival_datetime) : start
      return start && end ? { start, end } : null
    })
    .filter((leg): leg is { start: string; end: string } => leg !== null)
    .sort((x, y) => x.start.localeCompare(y.start))

  let checkOut = CHECK_OUT_TIME
  let checkIn = CHECK_IN_TIME
  if (legs.length > 0) {
    if (legs[0].start <= CHECK_OUT_TIME) checkOut = shiftTime(legs[0].start, -1)
    let journeyEnd = legs[0].end
    for (const leg of legs.slice(1)) {
      const gap = minutesOf(leg.start) - minutesOf(journeyEnd)
      if (gap < 0 || gap > CONNECTION_MINUTES) break
      journeyEnd = leg.end > journeyEnd ? leg.end : journeyEnd
    }
    if (journeyEnd >= CHECK_IN_TIME) checkIn = shiftTime(journeyEnd, 1)
  }
  return { checkIn, checkOut }
}

/**
 * Transport departing on `date` plus stay check-ins/check-outs on `date`,
 * ordered by time (see stayTimes for where stays go).
 */
export function buildStaticItems<T extends TimelineTransport, S extends TimelineStay>(
  transportations: T[],
  accommodations: S[],
  date: string,
): StaticTimelineItem<T, S>[] {
  const items: StaticTimelineItem<T, S>[] = []
  const today = transportations.filter((t) => dateMatches(t.departure_datetime, date))
  for (const t of today) items.push({ kind: "transport", data: t })
  const { checkIn, checkOut } = stayTimes(today, date)
  for (const a of accommodations) {
    // A time the traveller set wins over the guess.
    if (dateMatches(a.check_in, date)) {
      items.push({ kind: "accommodation", data: a, event: "check_in", at: a.check_in_time?.slice(0, 5) || checkIn })
    }
    if (dateMatches(a.check_out, date)) {
      items.push({ kind: "accommodation", data: a, event: "check_out", at: a.check_out_time?.slice(0, 5) || checkOut })
    }
  }
  return items.sort((a, b) => staticSortKey(a).localeCompare(staticSortKey(b)))
}

/** One row of a day's timeline, in display order. */
export type TimelineEntry<
  A = Activity,
  T extends TimelineTransport = Transportation,
  S extends TimelineStay = Accommodation,
> = { kind: "activity"; activity: A } | StaticTimelineItem<T, S>

/**
 * Merge read-only transport/stay items into the day's activities by time.
 *
 * Activities keep their saved (drag-and-drop) order. Each static item is
 * placed right before the first activity that starts later than it;
 * activities without a start time are skipped when looking for that spot.
 * Static items with no later activity go at the end.
 */
export function interleaveTimeline<
  A extends { id: string; start_time?: string | null },
  T extends TimelineTransport = Transportation,
  S extends TimelineStay = Accommodation,
>(activities: A[], staticItems: StaticTimelineItem<T, S>[]): TimelineEntry<A, T, S>[] {
  const entries: TimelineEntry<A, T, S>[] = []
  const pending = [...staticItems] // already sorted by time
  for (const activity of activities) {
    const start = activity.start_time?.slice(0, 5)
    if (start) {
      while (pending.length > 0 && staticSortKey(pending[0]) <= start) {
        entries.push(pending.shift()!)
      }
    }
    entries.push({ kind: "activity", activity })
  }
  entries.push(...pending)
  return entries
}
