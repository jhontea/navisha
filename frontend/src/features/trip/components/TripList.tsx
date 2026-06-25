"use client"

import Link from "next/link"
import { useUpcomingTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"
import { MaterialIcon } from "@/components/MaterialIcon"

export function TripList() {
  const { data, isLoading, isError, error } = useUpcomingTrips(6)

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

  const trips = data?.items ?? []

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
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

      <div className="mt-6 flex justify-end">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-body-sm font-label-md text-primary hover:opacity-80 transition-colors"
        >
          View all trips
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
        </Link>
      </div>
    </>
  )
}
