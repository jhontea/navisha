import type { Transportation } from "@/features/transportation/types"
import type { Accommodation } from "@/features/accommodation/types"
import type { Activity } from "../types"

/** Read-only items shown on a day's timeline next to its activities. */
export type StaticTimelineItem =
  | { kind: "transport"; data: Transportation }
  | { kind: "accommodation"; data: Accommodation; event: "check_in" | "check_out" }

// Stays have dates but no times; place them at typical hotel times.
const CHECK_IN_TIME = "14:00"
const CHECK_OUT_TIME = "12:00"

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

function staticSortKey(item: StaticTimelineItem): string {
  if (item.kind === "transport") return toSortKey(item.data.departure_datetime)
  return item.event === "check_in" ? CHECK_IN_TIME : CHECK_OUT_TIME
}

/**
 * Transport departing on `date` plus stay check-ins/check-outs on `date`,
 * ordered by time (check-in 14:00, check-out 12:00).
 */
export function buildStaticItems(
  transportations: Transportation[],
  accommodations: Accommodation[],
  date: string,
): StaticTimelineItem[] {
  const items: StaticTimelineItem[] = []
  for (const t of transportations) {
    if (dateMatches(t.departure_datetime, date)) items.push({ kind: "transport", data: t })
  }
  for (const a of accommodations) {
    if (dateMatches(a.check_in, date)) items.push({ kind: "accommodation", data: a, event: "check_in" })
    if (dateMatches(a.check_out, date)) items.push({ kind: "accommodation", data: a, event: "check_out" })
  }
  return items.sort((a, b) => staticSortKey(a).localeCompare(staticSortKey(b)))
}

/** One row of a day's timeline, in display order. */
export type TimelineEntry =
  | { kind: "activity"; activity: Activity }
  | StaticTimelineItem

/**
 * Merge read-only transport/stay items into the day's activities by time.
 *
 * Activities keep their saved (drag-and-drop) order. Each static item is
 * placed right before the first activity that starts later than it;
 * activities without a start time are skipped when looking for that spot.
 * Static items with no later activity go at the end.
 */
export function interleaveTimeline(activities: Activity[], staticItems: StaticTimelineItem[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []
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
