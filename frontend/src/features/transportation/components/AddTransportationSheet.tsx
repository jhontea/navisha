"use client"

import { lazyPreload } from "@/lib/lazyPreload"
import { usePrefetchOnIdle } from "@/lib/usePrefetchOnIdle"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import type { LinkedCost } from "@/lib/linkedCost"
import { useCreateTransportation } from "../hooks/useTransportations"
import type { CreateTransportationInput, TransportDraft } from "../types"

export const TransportationForm = lazyPreload(
  () => import("./TransportationForm").then((module) => module.TransportationForm),
  () => <div className="h-72 animate-pulse rounded-xl bg-skeleton" />,
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Values to prefill (e.g. read from a pasted confirmation), and its cost. */
  draft?: TransportDraft
  draftCost?: LinkedCost | null
  /** Called after the booking is saved, before the sheet closes. */
  onCreated?: () => void
  /** "YYYY-MM-DDTHH:mm" prefilled as departure. */
  defaultDeparture?: string
}

/** Add-transport sheet (with cost), shared by the Bookings tab and the itinerary. */
export function AddTransportationSheet({ tripId, tripBaseCurrency, open, onOpenChange, draft, draftCost, onCreated, defaultDeparture }: Props) {
  const createMut = useCreateTransportation(tripId)
  usePrefetchOnIdle(TransportationForm.preload)
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add transport">
      {open && (
        <TransportationForm
          tripBaseCurrency={tripBaseCurrency}
          withCost
          draft={draft}
          initialCost={draftCost}
          defaultDeparture={defaultDeparture}
          isSubmitting={createMut.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (input: CreateTransportationInput) => {
            await createMut.mutateAsync(input)
            onCreated?.()
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveSheet>
  )
}
