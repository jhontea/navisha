"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plane, Plus } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { dateSortKey } from "@/lib/calendar"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import {
  useCreateTransportation,
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { CreateTransportationInput, Transportation } from "../types"
import { TransportationCard } from "./TransportationCard"

const TransportationForm = dynamic(
  () => import("./TransportationForm").then((module) => module.TransportationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  /** Trip days, to label bookings with their day number. */
  days?: { date: string; day_number: number }[]
}

/** Transport list; add and edit open in a sheet (bottom sheet on phones). */
export function TransportationSection({ tripId, tripBaseCurrency, days = [] }: Props) {
  const { data, isLoading, isError } = useTransportations(tripId)
  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; item: Transportation } | null>(null)

  const createMut = useCreateTransportation(tripId)
  const updateMut = useUpdateTransportation(sheet?.mode === "edit" ? sheet.item.id : "", tripId)
  const deleteMut = useDeleteTransportation(tripId)

  // Chronological; undated entries last.
  const pendingDeletes = usePendingDeletes()
  const items = (data?.items ?? []).filter((x) => !pendingDeletes.has(x.id)).sort((x, y) =>
    dateSortKey(x.departure_datetime).localeCompare(dateSortKey(y.departure_datetime)),
  )

  return (
    <section aria-labelledby="transport-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="transport-heading" className="font-display text-xl font-extrabold text-foreground">
            Transport
          </h2>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "entry" : "entries"}
            </p>
          )}
        </div>
        <Button onClick={() => setSheet({ mode: "add" })}>
          <Plus aria-hidden="true" />
          Add transport
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3" aria-label="Loading transport">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="rounded-2xl bg-destructive-bg p-6 text-center text-sm text-destructive">
          Couldn&apos;t load transport. Check your connection and reload the page.
        </p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={Plane}
          size="sm"
          title="No transport yet"
          description="Add flights, trains, buses or transfers to see them in your itinerary."
          className="rounded-2xl border-2 border-dashed bg-card/60"
        />
      )}

      <div className="space-y-3">
        {items.map((t) => (
          <TransportationCard
            key={t.id}
            transportation={t}
            days={days}
            onEdit={() => setSheet({ mode: "edit", item: t })}
            onDelete={() =>
              scheduleDelete({
                id: t.id,
                message: "Transport deleted.",
                errorMessage: "Couldn’t delete this transport. It’s back in the list.",
                commit: () => deleteMut.mutateAsync(t.id),
              })
            }
          />
        ))}
      </div>

      <ResponsiveSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet?.mode === "edit" ? "Edit transport" : "Add transport"}
      >
        {sheet?.mode === "add" && (
          <TransportationForm
            tripBaseCurrency={tripBaseCurrency}
            withCost
            isSubmitting={createMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input: CreateTransportationInput) => {
              await createMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
        {sheet?.mode === "edit" && (
          <TransportationForm
            initial={sheet.item}
            lockType
            isSubmitting={updateMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input) => {
              await updateMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
      </ResponsiveSheet>

    </section>
  )
}
