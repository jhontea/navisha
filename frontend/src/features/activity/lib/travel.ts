import type { TimelineEntry } from "./timeline"

/** One end of a travel leg: an activity, or a stay's check-in/check-out. */
export interface TravelRef {
  kind: "activity" | "accommodation"
  id: string
  event?: "check_in" | "check_out"
}

/** Travel between two consecutive located timeline entries (GET /trips/:id/travel-times). */
export interface TravelLeg {
  from: TravelRef
  to: TravelRef
  mode: "walk" | "drive"
  minutes: number // drive already includes the busy-city factor
  distance_m: number
  source: "route" | "estimate"
  gap_minutes?: number
  tight?: boolean
}

const refKey = (r: TravelRef) => `${r.kind}:${r.id}${r.event ? `:${r.event}` : ""}`

/** Same key as refKey for a timeline entry; transport has no travel legs. */
export function entryRef(entry: TimelineEntry): string | null {
  if (entry.kind === "activity") return `activity:${entry.activity.id}`
  if (entry.kind === "accommodation") return `accommodation:${entry.data.id}:${entry.event}`
  return null
}

export function legsByPair(legs: TravelLeg[] = []): Map<string, TravelLeg> {
  return new Map(legs.map((leg) => [`${refKey(leg.from)}>${refKey(leg.to)}`, leg]))
}

/** The leg drawn between two adjacent entries, only when both match it exactly. */
export function legBetween(legs: Map<string, TravelLeg>, a: TimelineEntry, b: TimelineEntry | undefined) {
  const from = entryRef(a)
  const to = b && entryRef(b)
  return from && to ? legs.get(`${from}>${to}`) : undefined
}

// Driving times are rough (no traffic) and estimates are straight-line guesses.
const isApprox = (leg: TravelLeg) => leg.mode === "drive" || leg.source === "estimate"
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

/** Short duration: "45 min" under an hour, else "2h 17m" / "3h". */
export function shortDuration(total: number): string {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Spoken duration: "45 minutes", "2 hours 17 minutes", "1 hour". */
function spokenDuration(total: number): string {
  if (total < 60) return plural(total, "minute")
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${plural(h, "hour")} ${plural(m, "minute")}` : plural(h, "hour")
}

/** "12 min walk" / "≈ 25 min drive" / "≈ 2h 17m drive". */
export function travelText(leg: TravelLeg): string {
  return `${isApprox(leg) ? "≈ " : ""}${shortDuration(leg.minutes)} ${leg.mode}`
}

/** Screen-reader sentence, e.g. "About 25 minutes by car. Only 15 minutes between these plans." */
export function travelLabel(leg: TravelLeg): string {
  const travel = `${isApprox(leg) ? "About " : ""}${spokenDuration(leg.minutes)} ${leg.mode === "walk" ? "on foot" : "by car"}.`
  if (!leg.tight || leg.gap_minutes == null) return travel
  return leg.gap_minutes <= 0 ? `${travel} No time between these plans.` : `${travel} Only ${spokenDuration(leg.gap_minutes)} between these plans.`
}

/** The tight note after the travel time: "Tight: 15 min gap", or "No time between plans" for back-to-back plans. */
export function tightText(leg: TravelLeg): string | null {
  if (!leg.tight || leg.gap_minutes == null) return null
  return leg.gap_minutes <= 0 ? "No time between plans" : `Tight: ${shortDuration(leg.gap_minutes)} gap`
}
