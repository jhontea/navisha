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
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>
    </>
  )
}
