import { ItinerarySkeleton } from "@/features/activity/components/DayActivitiesSkeleton"

/** Trip tab loading: content only, since TripShell (the layout) already shows the hero and tabs. Same shape as ItineraryScreen's loading state. */
export default function TripDetailLoading() {
  return <ItinerarySkeleton />
}
