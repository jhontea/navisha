"use client"

import { lazyPreload } from "@/lib/lazyPreload"
import { usePrefetchOnIdle } from "@/lib/usePrefetchOnIdle"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import type { LinkedCost } from "@/lib/linkedCost"
import { useCreateAccommodation } from "../hooks/useAccommodations"
import type { CreateAccommodationInput, StayDraft } from "../types"

export const AccommodationForm = lazyPreload(
  () => import("./AccommodationForm").then((module) => module.AccommodationForm),
  () => <div className="h-72 animate-pulse rounded-xl bg-skeleton" />,
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Values to prefill (e.g. read from a pasted confirmation), and its cost. */
  draft?: StayDraft
  draftCost?: LinkedCost | null
  /** Called after the booking is saved, before the sheet closes. */
  onCreated?: () => void
  /** Trip days, for the check-in default and the trip outline in the date picker. */
  days: { date: string }[]
  /** "YYYY-MM-DD" check-in to prefill. */
  checkIn?: string
  destination?: string
}

/** Add-stay sheet (with cost), shared by the Bookings tab and the itinerary. */
export function AddStaySheet({ tripId, tripBaseCurrency, open, onOpenChange, draft, draftCost, onCreated, days, checkIn, destination }: Props) {
  const createMut = useCreateAccommodation(tripId)
  usePrefetchOnIdle(AccommodationForm.preload)
  const tripDates = days.map((d) => d.date).sort()
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add stay">
      {open && (
        <AccommodationForm
          tripBaseCurrency={tripBaseCurrency}
          withCost
          draft={draft}
          initialCost={draftCost}
          defaultDate={tripDates[0]}
          initialCheckIn={checkIn}
          tripEnd={tripDates[tripDates.length - 1]}
          searchContext={destination}
          isSubmitting={createMut.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (input: CreateAccommodationInput) => {
            await createMut.mutateAsync(input)
            onCreated?.()
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveSheet>
  )
}
