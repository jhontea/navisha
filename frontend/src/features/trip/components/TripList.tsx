"use client"

import Link from "next/link"
import { useTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"

function MaterialIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

export function TripList() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrips()

  if (isLoading) {
    return (
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3].map((i) => (
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
    )
  }

  if (isError) {
    return (
      <p className="text-body-sm text-error">
        Failed to load trips: {error?.message ?? "unknown error"}
      </p>
    )
  }

  const trips = data?.pages.flatMap((p) => p.items) ?? []

  if (trips.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-high">
          <MaterialIcon name="map" size={48} className="text-outline" />
        </div>
        <h2 className="text-headline-md font-headline-md text-on-surface mb-2">No trips planned yet</h2>
        <p className="text-body-md font-body-md text-on-surface-variant mb-8 max-w-sm">
          The world is waiting for you. Start planning your first adventure with Navisha today.
        </p>
        <Link
          href="/trips/new"
          className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 inline-flex items-center"
        >
          Create My First Trip
        </Link>
      </div>
    )
  }

  return (
    <>
      <section
        id="trip-container"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
      >
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </section>

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2.5 rounded-xl border border-outline-variant text-body-sm font-label-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  )
}
