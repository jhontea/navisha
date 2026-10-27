"use client"

import dynamic from "next/dynamic"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import type { LinkedCost } from "@/lib/linkedCost"
import { useCreateTransportation } from "../hooks/useTransportations"
import type { CreateTransportationInput, TransportDraft } from "../types"

const TransportationForm = dynamic(
  () => import("./TransportationForm").then((module) => module.TransportationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
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
