"use client"

import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { AccommodationSection } from "@/features/accommodation/components/AccommodationSection"

export default function TripStayPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)

  return (
    <main className="flex flex-col pb-4">
      {isLoading && !trip ? (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 space-y-10 animate-fade-in">
          <div>
            <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
            <div className="rounded-2xl border border-border/40 bg-card p-8 animate-pulse">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted" />
              <div className="mx-auto mt-4 h-4 w-32 rounded bg-muted" />
            </div>
          </div>
          <div>
            <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl border border-border/20 bg-card animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in">
          <AccommodationSection
            tripId={id}
            tripBaseCurrency={trip?.base_currency ?? "IDR"}
          />
        </div>
      )}

    </main>
  )
}
