"use client"

import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { AccommodationSection } from "@/features/accommodation/components/AccommodationSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { Skeleton } from "@/components/ui/skeleton"

export default function TripStayPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)

  return (
    <main className="flex flex-col pb-4">
      {trip && (
        <TripHero
          title={trip.title}
          description={trip.description}
          startDate={trip.start_date}
          endDate={trip.end_date}
          baseCurrency={trip.base_currency}
          coverImageUrl={trip.cover_image_url}
        />
      )}
      {!trip && isLoading && (
        <Skeleton variant="glass" className="h-40 w-full rounded-none" />
      )}

      <TripTabBar tripId={id} />

      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in">
        <AccommodationSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
        />
      </div>
    </main>
  )
}
