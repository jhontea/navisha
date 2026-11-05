import { Skeleton } from "@/components/ui/skeleton"

/**
 * A day's timeline while it loads: activity cards and the add button, about as
 * tall as a planned day so the content below starts off screen (no layout shift).
 * `data-day-loading` lets ItineraryScreen hold back the trip overview meanwhile.
 */
export function DayActivitiesSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading day activities" data-day-loading>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
      <Skeleton className="h-10 rounded-full" />
    </div>
  )
}

/** The itinerary tab while the trip loads: date circles and a day card. */
export function ItinerarySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-max-width flex-col gap-3 px-margin-mobile py-6 md:px-margin-desktop" aria-hidden="true">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="circle" className="size-12" />
        ))}
      </div>
      <div className="rounded-2xl border bg-card px-2 pb-4 pt-4 shadow-card sm:px-5">
        <Skeleton className="mx-2 mb-4 h-7 w-48 sm:mx-0" />
        <DayActivitiesSkeleton />
      </div>
    </div>
  )
}
