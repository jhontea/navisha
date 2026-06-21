"use client"

import { useState } from "react"
import Link from "next/link"
import { TripCard } from "@/features/trip/components/TripCard"
import { useFilteredTrips } from "@/features/trip/hooks/useTrips"

export default function TripsPage() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  // Applied filters (only update on submit)
  const [appliedFrom, setAppliedFrom] = useState("")
  const [appliedTo, setAppliedTo] = useState("")

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFilteredTrips(appliedFrom || undefined, appliedTo || undefined)

  const trips = data?.pages.flatMap((p) => p.items) ?? []

  const applyFilter = () => {
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const clearFilter = () => {
    setFrom("")
    setTo("")
    setAppliedFrom("")
    setAppliedTo("")
  }

  const hasFilter = appliedFrom || appliedTo

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
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
        <Link
          href="/trips/new"
          className="flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] self-start md:self-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          New Trip
        </Link>
      </header>

      {/* Filter bar */}
      <div className="mb-8 flex flex-wrap items-end gap-4 p-5 rounded-xl bg-white border border-outline-variant shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={applyFilter}
          className="px-5 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-all active:scale-95"
        >
          Apply
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={clearFilter}
            className="px-5 py-2 text-on-surface-variant font-label-md text-label-md rounded-lg border border-outline-variant hover:bg-surface-container transition-colors"
          >
            Clear
          </button>
        )}
        {hasFilter && (
          <span className="text-body-sm text-on-surface-variant">
            Filtering: {appliedFrom || '—'} → {appliedTo || '—'}
          </span>
        )}
      </div>

      {/* Trip Grid */}
      {isLoading ? (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-[#F1F5F9] bg-surface-container-lowest overflow-hidden animate-pulse">
              <div className="h-48 bg-surface-container-high" />
              <div className="p-6 space-y-3">
                <div className="h-3 w-1/3 rounded bg-surface-container-high" />
                <div className="h-5 w-2/3 rounded bg-surface-container-high" />
                <div className="h-3 w-1/2 rounded bg-surface-container-high" />
              </div>
            </div>
          ))}
        </section>
      ) : isError ? (
        <p className="text-body-sm text-error">
          Failed to load trips: {error?.message ?? "unknown error"}
        </p>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: 48 }}>map</span>
          </div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-2">
            {hasFilter ? "No trips match the filter" : "No trips yet"}
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mb-8 max-w-sm">
            {hasFilter ? "Try adjusting or clearing the date filter." : "Start planning your first adventure."}
          </p>
          {!hasFilter && (
            <Link
              href="/trips/new"
              className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all"
            >
              Create My First Trip
            </Link>
          )}
        </div>
      ) : (
        <>
          <section
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
          >
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </section>

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
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
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
