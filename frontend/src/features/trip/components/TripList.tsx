"use client"

import Link from "next/link"
import { useUpcomingTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"
import { OnboardingCard } from "./OnboardingCard"
import { useAuth } from "@/features/auth/hooks"
import { Skeleton } from "@/components/ui/skeleton"

export function TripList() {
  const { data, isLoading, isError, error: _error } = useUpcomingTrips(6)
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="glass" className="h-56 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load trips. Please try again.
      </p>
    )
  }

  const trips = data?.items ?? []

  if (trips.length === 0) {
    return <OnboardingCard userName={firstName} />
  }

  return (
    <>
      {/* 1-col mobile, 2-col tablet, 3-col desktop */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </>
  )
}
