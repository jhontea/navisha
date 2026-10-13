"use client"

import { useMemo } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks"
import { NextUpCard } from "@/features/trip/components/NextUpCard"
import { OnboardingCard } from "@/features/trip/components/OnboardingCard"
import { TripCard } from "@/features/trip/components/TripCard"
import { TripCTAs } from "@/features/trip/components/TripCTAs"
import { useDashboardTrips, useTrips } from "@/features/trip/hooks/useTrips"
import { groupTrips, pickNextUp, tripStats } from "@/features/trip/lib/home"
import type { Trip } from "@/features/trip/types"

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"

function TripGrid({ id, title, trips }: { id: string; title: string; trips: Trip[] }) {
  if (trips.length === 0) return null
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className={GRID}>
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>
    </section>
  )
}

/**
 * Trips home: the trip in progress or next up, then every trip grouped into
 * Upcoming and Past. /dashboard redirects here.
 */
export default function TripsPage() {
  const { user } = useAuth()
  const dashboard = useDashboardTrips()
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useTrips()

  const allTrips = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const { upcoming, past } = useMemo(() => groupTrips(allTrips), [allTrips])
  // The upcoming endpoint is ordered by start date, so it finds the next trip
  // even when it is not on the first page of the list.
  const nextUp = useMemo(
    () => pickNextUp(dashboard.data?.upcoming.items ?? []) ?? pickNextUp(allTrips),
    [dashboard.data, allTrips],
  )
  const upcomingRest = upcoming.filter((t) => t.id !== nextUp?.id)
  const stats = tripStats(allTrips)
  const firstName = user?.name?.split(" ")[0]

  return (
    <main className="mx-auto w-full max-w-max-width px-margin-mobile pb-28 pt-6 md:px-margin-desktop">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Trips</h1>
          {allTrips.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {stats.trips} {stats.trips === 1 ? "trip" : "trips"} · {stats.days} days ·{" "}
              {stats.currencies} {stats.currencies === 1 ? "currency" : "currencies"}
            </p>
          )}
        </div>
        {allTrips.length > 0 && <TripCTAs />}
      </header>

      {isLoading ? (
        <div className="space-y-6" aria-label="Loading trips" aria-busy="true">
          <div className="h-52 animate-pulse rounded-xl bg-muted" />
          <div className={GRID}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-60 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t load your trips.</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : allTrips.length === 0 ? (
        <OnboardingCard userName={firstName} />
      ) : (
        <div className="space-y-10">
          {nextUp && <NextUpCard trip={nextUp} />}
          <TripGrid id="upcoming-heading" title={nextUp ? "Also coming up" : "Upcoming"} trips={upcomingRest} />
          <TripGrid id="past-heading" title="Past" trips={past} />

          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                <ChevronDown aria-hidden="true" />
                {isFetchingNextPage ? "Loading…" : "Load more trips"}
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
