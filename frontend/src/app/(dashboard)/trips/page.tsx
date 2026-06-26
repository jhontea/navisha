"use client"

import { useState } from "react"
import Link from "next/link"
import { BackLink } from "@/components/BackLink"
import { TripCard } from "@/features/trip/components/TripCard"
import { TripCTAs } from "@/features/trip/components/TripCTAs"
import { useFilteredTrips } from "@/features/trip/hooks/useTrips"

export default function TripsPage() {
  const [appliedFrom, setAppliedFrom] = useState("")
  const [appliedTo, setAppliedTo] = useState("")

  const {
    data,
    isLoading,
    isError,
    error: _error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFilteredTrips(appliedFrom || undefined, appliedTo || undefined)

  const trips = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      {/* Back to dashboard */}
      <BackLink href="/dashboard" />

      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-surface">
            All Trips
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Your complete travel history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <TripCTAs />
        </div>
      </header>


      {/* Filter chips — Phase 3B-3: replaces date-range form */}
      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { label: "All", from: "", to: "" },
          { label: "Upcoming", from: "", to: "active" },
          { label: "2026", from: "2026-01-01", to: "2026-12-31" },
          { label: "2025", from: "2025-01-01", to: "2025-12-31" },
        ].map((chip) => {
          const isActive =
            appliedFrom === chip.from && appliedTo === chip.to;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setAppliedFrom(chip.from);
                setAppliedTo(chip.to);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Trip list — single column mobile-first */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 w-full animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-body-sm text-error">
          Failed to load trips. Please try again.
        </p>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-outline text-5xl">map</span>
          </div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
            No trips yet
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mb-8 max-w-sm">
            Start planning your first adventure.
          </p>
          <Link
            href="/trips/new"
            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all"
          >
            Create My First Trip
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-8 py-3 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Loading…
                  </>
                ) : (
                  `Load more (${trips.length} loaded)`
                )}
              </button>
            </div>
          )}

          {!hasNextPage && trips.length > 0 && (
            <p className="mt-8 text-center text-body-sm text-on-surface-variant">
              All {trips.length} trip{trips.length !== 1 ? 's' : ''} shown
            </p>
          )}
        </>
      )}
    </div>
  )
}
