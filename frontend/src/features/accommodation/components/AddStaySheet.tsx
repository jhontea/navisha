"use client"

import dynamic from "next/dynamic"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { useCreateAccommodation } from "../hooks/useAccommodations"
import type { CreateAccommodationInput } from "../types"

const AccommodationForm = dynamic(
  () => import("./AccommodationForm").then((module) => module.AccommodationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Trip days, for the check-in default and the trip outline in the date picker. */
  days: { date: string }[]
  /** "YYYY-MM-DD" check-in to prefill. */
  checkIn?: string
  destination?: string
}

/** Add-stay sheet (with cost), shared by the Bookings tab and the itinerary. */
export function AddStaySheet({ tripId, tripBaseCurrency, open, onOpenChange, days, checkIn, destination }: Props) {
  const createMut = useCreateAccommodation(tripId)
  const tripDates = days.map((d) => d.date).sort()
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add stay">
      {open && (
        <AccommodationForm
          tripBaseCurrency={tripBaseCurrency}
          withCost
          defaultDate={tripDates[0]}
          initialCheckIn={checkIn}
          tripEnd={tripDates[tripDates.length - 1]}
          searchContext={destination}
          isSubmitting={createMut.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (input: CreateAccommodationInput) => {
            await createMut.mutateAsync(input)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveSheet>
  )
}
