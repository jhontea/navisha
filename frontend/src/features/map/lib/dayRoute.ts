import type { Accommodation } from "@/features/accommodation/types"
import type { Activity } from "@/features/activity/types"
import { buildStaticItems, interleaveTimeline } from "@/features/activity/lib/timeline"
import type { Transportation } from "@/features/transportation/types"

/** One stop on a day's route, in itinerary order. */
export type RouteStop =
  | { kind: "activity"; activity: Activity }
  | { kind: "stay"; stay: Accommodation; event: "night" | "check_in" | "check_out" }

/**
 * The day's route in the order of its itinerary: the hotel you wake up in
 * (a night between check-in and check-out), then activities, check-out and
 * check-in where the timeline puts them. Transport is the line between stops,
 * not a stop. Activities are returned whatever their type; callers keep the
 * ones they can pin.
 */
export function dayRoute(
  activities: Activity[],
  transportations: Transportation[],
  stays: Accommodation[],
  date: string,
): RouteStop[] {
  const stops: RouteStop[] = []
  for (const stay of stays) {
    if (stay.check_in < date && date < stay.check_out) stops.push({ kind: "stay", stay, event: "night" })
  }
  for (const entry of interleaveTimeline(activities, buildStaticItems(transportations, stays, date))) {
    if (entry.kind === "activity") stops.push({ kind: "activity", activity: entry.activity })
    else if (entry.kind === "accommodation") stops.push({ kind: "stay", stay: entry.data, event: entry.event })
  }
  return stops
}
