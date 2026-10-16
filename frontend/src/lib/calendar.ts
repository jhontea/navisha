/**
 * Calendar-date helpers for bookings. Values are the API's local wall-clock
 * strings ("2026-05-10" or "2026-05-10T06:30:00"); they are read as written,
 * never converted through UTC, so the shown time and date match the ticket.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MS_PER_DAY = 86_400_000

function dateParts(value?: string | null) {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!m) return null
  return { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) }
}

function dayNumber(value?: string | null): number | null {
  const p = dateParts(value)
  return p ? Date.UTC(p.y, p.mo, p.d) / MS_PER_DAY : null
}

/** "2026-05-10T06:30:00" -> "06:30". */
export function formatClock(value?: string | null): string | null {
  const m = value ? /T(\d{2}):(\d{2})/.exec(value) : null
  return m ? `${m[1]}:${m[2]}` : null
}

/** "2026-05-10" -> "Sun, 10 May". */
export function formatWeekdayDate(value?: string | null): string | null {
  const p = dateParts(value)
  if (!p) return null
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.mo, p.d)).getUTCDay()]
  return `${weekday}, ${p.d} ${MONTHS[p.mo]}`
}

/** "10–14 May", "28 Apr – 3 May" (no year; bookings sit inside one trip). */
export function formatShortRange(start?: string | null, end?: string | null): string | null {
  const a = dateParts(start)
  const b = dateParts(end)
  if (!a && !b) return null
  if (!a || !b) {
    const only = (a ?? b)!
    return `${only.d} ${MONTHS[only.mo]}`
  }
  if (a.y === b.y && a.mo === b.mo) return a.d === b.d ? `${a.d} ${MONTHS[a.mo]}` : `${a.d}–${b.d} ${MONTHS[a.mo]}`
  return `${a.d} ${MONTHS[a.mo]} – ${b.d} ${MONTHS[b.mo]}`
}

/** Calendar days from `from` to `to` (0 when the same date). Null if either is missing. */
export function daysBetween(from?: string | null, to?: string | null): number | null {
  const a = dayNumber(from)
  const b = dayNumber(to)
  return a === null || b === null ? null : b - a
}

/** Nights of a stay by calendar date, at least 1. Null without both dates. */
export function nightsBetween(checkIn?: string | null, checkOut?: string | null): number | null {
  const n = daysBetween(checkIn, checkOut)
  return n === null ? null : Math.max(1, n)
}

/** Trip day number for a date ("Day 3"), or null when outside the trip. */
export function tripDayNumber(
  value: string | null | undefined,
  days: { date: string; day_number: number }[],
): number | null {
  const date = dateParts(value)
  if (!date) return null
  const key = `${date.y}-${String(date.mo + 1).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
  return days.find((d) => d.date.slice(0, 10) === key)?.day_number ?? null
}

/** Sort key that keeps undated items last. */
export function dateSortKey(value?: string | null): string {
  return value || "9999"
}

/** Today as "YYYY-MM-DD" in the user's local timezone. */
export function localDateString(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The date a new booking or expense of a trip starts on: today while the
 * trip is under way, otherwise its first day. Today when the trip dates are
 * unknown.
 */
export function defaultTripDate(start?: string | null, end?: string | null, today = localDateString()): string {
  if (!start || !dateParts(start)) return today
  if (end && today >= start && today <= end) return today
  return start.slice(0, 10)
}
