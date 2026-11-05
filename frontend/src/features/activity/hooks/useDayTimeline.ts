import { useIsRestoring } from "@tanstack/react-query"
import { useActivities } from "./useActivities"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import { buildStaticItems } from "../lib/timeline"
import { findActivityOverlaps } from "../lib/time"

/**
 * Everything a day's timeline shows: the day's activities (in their saved
 * order), read-only transport/stay items on that date, and which location
 * activities overlap in time.
 */
export function useDayTimeline(tripId: string, dayId: string, date: string) {
  const activitiesQuery = useActivities(dayId)
  const transQuery = useTransportations(tripId)
  const accomQuery = useAccommodations(tripId)
  // Loading until all three settle, so late transport/stay rows don't push the day down.
  // While the persisted cache restores, queries wait with no data and isLoading false.
  const isRestoring = useIsRestoring()
  const isLoading = [activitiesQuery, transQuery, accomQuery].some(
    (query) => query.isLoading || (isRestoring && query.isPending),
  )

  const activities = activitiesQuery.data?.items ?? []
  const staticItems = buildStaticItems(transQuery.data?.items ?? [], accomQuery.data?.items ?? [], date)
  const overlapByActivity = findActivityOverlaps(
    activities.filter((activity) => activity.type === "location"),
  )

  return { isLoading, activities, staticItems, overlapByActivity }
}
