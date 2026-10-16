"use client"

import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { TransportationSection } from "@/features/transportation/components/TransportationSection"
import { AccommodationSection } from "@/features/accommodation/components/AccommodationSection"

/** Bookings = Transport + Stays on one page (D3). */
export function BookingsScreen() {
  const { id } = useParams<{ id: string }>()
  const { data: trip, isLoading } = useTrip(id)

  if (isLoading && !trip) {
    return (
      <main className="mx-auto w-full max-w-max-width space-y-3 px-margin-mobile py-6 md:px-margin-desktop">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
        ))}
      </main>
    )
  }

  const baseCurrency = trip?.base_currency ?? "IDR"

  return (
    <main className="mx-auto grid w-full max-w-max-width grid-cols-[minmax(0,1fr)] items-start gap-10 px-margin-mobile pb-6 pt-6 md:px-margin-desktop md:pb-8 lg:grid-cols-2 lg:gap-8">
      <TransportationSection tripId={id} tripBaseCurrency={baseCurrency} days={trip?.days} />
      <AccommodationSection tripId={id} tripBaseCurrency={baseCurrency} days={trip?.days} destination={trip?.description} />
    </main>
  )
}
