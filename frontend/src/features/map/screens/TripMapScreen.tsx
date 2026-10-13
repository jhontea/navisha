"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"

// Map libraries are heavy; load them only on this tab.
const TripMap = dynamic(
  () => import("@/features/map/components/TripMap").then((m) => ({ default: m.TripMap })),
  {
    ssr: false,
    loading: () => <div className="h-[60vh] animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

export function TripMapScreen() {
  const { id } = useParams<{ id: string }>()
  const { data: trip, isLoading } = useTrip(id)

  return (
    <main className="mx-auto w-full max-w-max-width px-margin-mobile pb-6 pt-4 md:px-margin-desktop md:pb-8">
      {isLoading || !trip ? (
        <div className="h-[60vh] animate-pulse rounded-xl bg-muted" aria-hidden="true" />
      ) : (
        <TripMap tripId={id} days={trip.days} />
      )}
    </main>
  )
}
