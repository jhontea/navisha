"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plane, Plus } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { dateSortKey } from "@/lib/calendar"
import { linkedCost, linkedCostText } from "@/lib/linkedCost"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import { useExpenses } from "@/features/expense/hooks/useExpenses"
import {
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { Transportation } from "../types"
import { AddTransportationSheet } from "./AddTransportationSheet"
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

  const updateMut = useUpdateTransportation(sheet?.mode === "edit" ? sheet.item.id : "", tripId)
  const deleteMut = useDeleteTransportation(tripId)
  // The edit form shows the cost only once the expenses are known, so a
  // save can never clear a cost it did not load.
  const expenses = useExpenses(tripId)

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
            cost={linkedCostText(expenses.data?.items, "transportation", t.id)}
            onEdit={() => setSheet({ mode: "edit", item: t })}
            onDelete={() =>
              scheduleDelete({
                id: t.id,
                message: linkedCost(expenses.data?.items, "transportation", t.id)
                  ? "Transport deleted. Its cost stays in Budget."
                  : "Transport deleted.",
                errorMessage: "Couldn’t delete this transport. It’s back in the list.",
                commit: () => deleteMut.mutateAsync(t.id),
              })
            }
          />
        ))}
      </div>

      <ResponsiveSheet
        open={sheet?.mode === "edit"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Edit transport"
      >
        {sheet?.mode === "edit" && (
          <TransportationForm
            initial={sheet.item}
            lockType
            tripBaseCurrency={tripBaseCurrency}
            withCost={expenses.isSuccess}
            initialCost={linkedCost(expenses.data?.items, "transportation", sheet.item.id)}
            isSubmitting={updateMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input) => {
              await updateMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
      </ResponsiveSheet>

      <AddTransportationSheet
        tripId={tripId}
        tripBaseCurrency={tripBaseCurrency}
        open={sheet?.mode === "add"}
        onOpenChange={(open) => !open && setSheet(null)}
      />

    </section>
  )
}
