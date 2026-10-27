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
const minutes = (n: number) => `${n} ${n === 1 ? "minute" : "minutes"}`

/** "12 min walk" / "≈ 25 min drive". */
export function travelText(leg: TravelLeg): string {
  return `${isApprox(leg) ? "≈ " : ""}${leg.minutes} min ${leg.mode}`
}

/** Screen-reader sentence, e.g. "About 25 minutes by car. Only 15 minutes between these plans." */
export function travelLabel(leg: TravelLeg): string {
  const travel = `${isApprox(leg) ? "About " : ""}${minutes(leg.minutes)} ${leg.mode === "walk" ? "on foot" : "by car"}.`
  return leg.tight && leg.gap_minutes != null ? `${travel} Only ${minutes(leg.gap_minutes)} between these plans.` : travel
}
