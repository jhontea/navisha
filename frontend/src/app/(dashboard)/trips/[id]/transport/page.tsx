"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { TransportationSection } from "@/features/transportation/components/TransportationSection"
import { formatDateRange } from "@/lib/utils"

export default function TripTransportPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)

  return (
    <main className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 px-4 py-4 backdrop-blur-md md:px-10 md:py-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Active Trip
          </span>
          {trip && (
            <span className="text-xs text-muted-foreground md:text-sm">
              · {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          )}
        </div>
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-3xl">
          {isLoading ? (
            <span className="block h-8 w-48 animate-pulse rounded bg-muted" />
          ) : (
            trip?.title ?? "Trip"
          )}
        </h1>
        {trip?.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{trip.description}</p>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        <div className="mb-6 flex items-center gap-1.5">
          <Link
            href={`/trips/${id}/overview`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="m15 18-6-6 6-6"/></svg>
            Back to Trip Overview
          </Link>

        </div>
        <TransportationSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
        />
      </div>
    </main>
  )
}
