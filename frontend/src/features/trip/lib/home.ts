import { getTripDateMetrics, type TripDateMetrics } from "./status"
import type { Trip } from "../types"

type TripDates = Pick<Trip, "start_date" | "end_date">

export interface GroupedTrips<T extends TripDates> {
  /** Active and upcoming trips, soonest first. */
  upcoming: T[]
  /** Finished trips, most recent first. */
  past: T[]
}

export function groupTrips<T extends TripDates>(trips: T[], today = new Date()): GroupedTrips<T> {
  const upcoming: T[] = []
  const past: T[] = []
  for (const t of trips) {
    if (getTripDateMetrics(t.start_date, t.end_date, today).status === "past") past.push(t)
    else upcoming.push(t)
  }
  upcoming.sort((a, b) => a.start_date.localeCompare(b.start_date))
  past.sort((a, b) => b.start_date.localeCompare(a.start_date))
  return { upcoming, past }
}

/** The trip to surface first: one in progress, else the soonest upcoming. */
export function pickNextUp<T extends TripDates>(trips: T[], today = new Date()): T | null {
  const { upcoming } = groupTrips(trips, today)
  return (
    upcoming.find((t) => getTripDateMetrics(t.start_date, t.end_date, today).status === "active") ??
    upcoming[0] ??
    null
  )
}

/** "Day 3 of 7", "Starts tomorrow", "In 12 days", "Completed". */
export function tripTimingLabel(m: TripDateMetrics): string {
  if (m.status === "active") return `Day ${m.currentDay} of ${m.totalDays}`
  if (m.status === "past") return "Completed"
  if (m.daysUntilStart <= 1) return "Starts tomorrow"
  return `In ${m.daysUntilStart} days`
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function parts(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  return { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) }
}

/** Compact range: "10–19 May 2026", "28 Apr – 3 May 2026", "30 Dec 2026 – 2 Jan 2027". */
export function formatTripRange(start: string, end: string): string {
  const a = parts(start)
  const b = parts(end)
  if (!a || !b) return ""
  if (a.y === b.y && a.mo === b.mo && a.d === b.d) return `${a.d} ${MONTHS[a.mo]} ${a.y}`
  if (a.y === b.y && a.mo === b.mo) return `${a.d}–${b.d} ${MONTHS[a.mo]} ${a.y}`
  if (a.y === b.y) return `${a.d} ${MONTHS[a.mo]} – ${b.d} ${MONTHS[b.mo]} ${a.y}`
  return `${a.d} ${MONTHS[a.mo]} ${a.y} – ${b.d} ${MONTHS[b.mo]} ${b.y}`
}

export interface TripStats {
  trips: number
  days: number
  currencies: number
}

/** Totals from real trip data only: trip count, planned days, base currencies. */
export function tripStats(trips: (TripDates & Pick<Trip, "base_currency">)[]): TripStats {
  return {
    trips: trips.length,
    days: trips.reduce((sum, t) => sum + getTripDateMetrics(t.start_date, t.end_date).totalDays, 0),
    currencies: new Set(trips.map((t) => t.base_currency)).size,
  }
}
