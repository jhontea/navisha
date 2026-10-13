"use client"

import { useParams } from "next/navigation"
import { ChevronDown, List } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { TripOverview } from "@/features/trip/components/TripOverview"

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data: trip, isLoading, isError } = useTrip(id)

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-max-width flex-col gap-3 px-margin-mobile py-6 md:px-margin-desktop">
        <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (isError || !trip) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <p className="text-sm text-destructive">
          Trip not found or you don&apos;t have access to it.
        </p>
      </div>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-max-width flex-col px-margin-mobile pb-6 pt-4 md:px-margin-desktop md:pb-8">
      {/* Trip overview (the former Overview tab), collapsed by default so the
          itinerary stays the main content. */}
      <details className="group mb-4 rounded-xl border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Trip overview
          <ChevronDown
            className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t px-4 pb-2">
          <TripOverview tripId={id} />
        </div>
      </details>

      {trip.days.length === 0 ? (
        <EmptyState
          icon={List}
          size="sm"
          title="No days yet"
          description="Generate your itinerary to see daily plans here."
          className="rounded-xl border border-dashed"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {trip.days.map((d, idx) => (
            <DayPanel
              key={d.id}
              tripId={id}
              dayId={d.id}
              dayNumber={d.day_number}
              date={d.date}
              title={d.title ?? ""}
              notes={d.notes ?? ""}
              destination={trip.description}
              defaultExpanded={idx === 0}
              days={trip.days}
            />
          ))}
        </div>
      )}
    </main>
  )
}
