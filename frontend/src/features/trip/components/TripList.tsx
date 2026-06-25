"use client"

import Link from "next/link"
import { useUpcomingTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"
import { EmptyState } from "@/components/EmptyState"

export function TripList() {
  const { data, isLoading, isError, error } = useUpcomingTrips(6)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 w-full animate-pulse rounded-xl bg-surface-container-high" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load trips: {error?.message ?? "unknown error"}
      </p>
    )
  }

  const trips = data?.items ?? []

  if (trips.length === 0) {
    return (
      <EmptyState
        icon="map"
        title="No trips planned yet"
        description="The world is waiting for you. Start planning your first adventure with Navisha today."
        actionLabel="Create My First Trip"
        actionHref="/trips/new"
        size="large"
      />
    )
  }

  return (
    <>
      {/* Phase 3B-3: Single-column vertical list (not dashboard grid) */}
      <div className="flex flex-col gap-4">
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-colors"
        >
          View all trips
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>
    </>
  )
}
