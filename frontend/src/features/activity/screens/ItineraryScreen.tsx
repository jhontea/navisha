"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { ChevronDown, List } from "lucide-react"

import { DateCircles } from "@/components/DateCircles"
import { EmptyState } from "@/components/EmptyState"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { useTripOverview } from "@/features/trip/overview"
import { toLocalISODate } from "@/features/trip/lib/status"
import type { Day } from "@/features/trip/types"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { ItineraryFocusProvider, useItineraryFocus } from "@/features/activity/ItineraryFocus"
import { TripOverview } from "@/features/trip/components/TripOverview"

// The side map only renders on wide screens; keep map libraries out of the
// initial bundle.
const DayMap = dynamic(() => import("@/features/map/components/DayMap").then((m) => m.DayMap), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse rounded-2xl bg-muted" aria-hidden="true" />,
})

/** Map of the selected day, beside the timeline on desktop (split view). */
function ItineraryMapPane({ tripId, days }: { tripId: string; days: Day[] }) {
  const { activeDayId, selectedActivityId, selectActivity } = useItineraryFocus()
  return (
    <aside
      className="sticky top-[8.5rem] hidden h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border shadow-card lg:block"
      aria-label="Map of the selected day"
    >
      <DayMap
        tripId={tripId}
        days={days}
        dayId={activeDayId}
        selectedActivityId={selectedActivityId}
        onSelectActivity={selectActivity}
      />
    </aside>
  )
}

/** Today's day while the trip runs, otherwise Day 1. */
function initialDay(days: Day[]): string | null {
  const today = toLocalISODate()
  return days.find((d) => d.date === today)?.id ?? days[0]?.id ?? null
}

function DayView({ tripId, days, destination }: { tripId: string; days: Day[]; destination: string }) {
  const { activeDayId, setActiveDayId, selectActivity } = useItineraryFocus()
  const { data: overview } = useTripOverview(tripId)
  const counts = overview?.activity_count_by_day ?? {}
  const day = days.find((d) => d.id === activeDayId) ?? days[0]

  return (
    <>
      <div className="sticky top-0 z-20 -mx-margin-mobile mb-3 bg-background/95 px-margin-mobile pt-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none">
        <DateCircles
          aria-label="Trip day"
          days={days.map((d) => ({ id: d.id, date: d.date, hasItems: (counts[d.id] ?? 0) > 0 }))}
          value={day.id}
          onChange={(id) => {
            selectActivity(null)
            setActiveDayId(id)
          }}
        />
      </div>

      {/* Keyed by day: switching days remounts the panel (fresh title edit / select state). */}
      <DayPanel
        key={day.id}
        tripId={tripId}
        dayId={day.id}
        dayNumber={day.day_number}
        date={day.date}
        title={day.title ?? ""}
        notes={day.notes ?? ""}
        destination={destination}
        days={days}
      />
    </>
  )
}

export function ItineraryScreen() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data: trip, isLoading, isError } = useTrip(id)

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-max-width flex-col gap-3 px-margin-mobile py-6 md:px-margin-desktop">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="size-12 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
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
    <ItineraryFocusProvider initialDayId={initialDay(trip.days)}>
      <main className="mx-auto grid w-full max-w-max-width gap-5 px-margin-mobile pb-6 pt-4 md:px-margin-desktop md:pb-8 md:pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,37.5rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          {trip.days.length === 0 ? (
            <EmptyState
              icon={List}
              size="sm"
              title="No days yet"
              description="Set the trip dates to get one day per date."
              className="rounded-2xl border border-dashed"
            />
          ) : (
            <DayView tripId={id} days={trip.days} destination={trip.description} />
          )}

          {/* Trip overview (the former Overview tab), collapsed so the day stays the main content. */}
          <details className="group mt-4 rounded-2xl border bg-card shadow-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 font-display text-base font-extrabold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              Trip overview
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t px-5 pb-2">
              <TripOverview tripId={id} />
            </div>
          </details>
        </div>

        {trip.days.length > 0 && <ItineraryMapPane tripId={id} days={trip.days} />}
      </main>
    </ItineraryFocusProvider>
  )
}
