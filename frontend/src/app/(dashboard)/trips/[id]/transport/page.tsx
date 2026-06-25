"use client"

import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { TransportationSection } from "@/features/transportation/components/TransportationSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"

export default function TripTransportPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)

  return (
    <main className="flex flex-col pb-4">
      {/* Phase 3B-2: Visual hero */}
      {trip && (
        <TripHero
          title={trip.title}
          description={trip.description}
          startDate={trip.start_date}
          endDate={trip.end_date}
          baseCurrency={trip.base_currency}
        />
      )}
      {!trip && isLoading && (
        <div className="h-40 w-full animate-pulse bg-muted" />
      )}

      {/* Tab navigation */}
      <TripTabBar tripId={id} />

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        <TransportationSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
        />
      </div>
    </main>
  )
}
