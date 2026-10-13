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
  const { data: activitiesData, isLoading } = useActivities(dayId)
  const { data: transData } = useTransportations(tripId)
  const { data: accomData } = useAccommodations(tripId)

  const activities = activitiesData?.items ?? []
  const staticItems = buildStaticItems(transData?.items ?? [], accomData?.items ?? [], date)
  const overlapByActivity = findActivityOverlaps(
    activities.filter((activity) => activity.type === "location"),
  )

  return { isLoading, activities, staticItems, overlapByActivity }
}
