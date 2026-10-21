"use client"

import dynamic from "next/dynamic"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { useCreateTransportation } from "../hooks/useTransportations"
import type { CreateTransportationInput } from "../types"

const TransportationForm = dynamic(
  () => import("./TransportationForm").then((module) => module.TransportationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "YYYY-MM-DDTHH:mm" prefilled as departure. */
  defaultDeparture?: string
}

/** Add-transport sheet (with cost), shared by the Bookings tab and the itinerary. */
export function AddTransportationSheet({ tripId, tripBaseCurrency, open, onOpenChange, defaultDeparture }: Props) {
  const createMut = useCreateTransportation(tripId)
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add transport">
      {open && (
        <TransportationForm
          tripBaseCurrency={tripBaseCurrency}
          withCost
          defaultDeparture={defaultDeparture}
          isSubmitting={createMut.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (input: CreateTransportationInput) => {
            await createMut.mutateAsync(input)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveSheet>
  )
}
