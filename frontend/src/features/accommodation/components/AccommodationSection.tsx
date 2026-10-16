"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Hotel, Plus } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { dateSortKey } from "@/lib/calendar"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import {
  useAccommodations,
  useCreateAccommodation,
  useDeleteAccommodation,
  useUpdateAccommodation,
} from "../hooks/useAccommodations"
import type { Accommodation, CreateAccommodationInput } from "../types"
import { AccommodationCard } from "./AccommodationCard"

const AccommodationForm = dynamic(
  () => import("./AccommodationForm").then((module) => module.AccommodationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

interface Props {
  tripId: string
  tripBaseCurrency: string
  /** Trip days, to label bookings with their day number. */
  days?: { date: string; day_number: number }[]
  /** Trip destination, to bias the location search. */
  destination?: string
}

/** Stay list; add and edit open in a sheet (bottom sheet on phones). */
export function AccommodationSection({ tripId, tripBaseCurrency, days = [], destination }: Props) {
  const { data, isLoading, isError } = useAccommodations(tripId)
  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; item: Accommodation } | null>(null)

  const createMut = useCreateAccommodation(tripId)
  const updateMut = useUpdateAccommodation(sheet?.mode === "edit" ? sheet.item.id : "", tripId)
  const deleteMut = useDeleteAccommodation(tripId)
  // The date picker opens on the trip, not on today's month.
  const tripStart = days.map((d) => d.date).sort()[0]

  // Chronological; undated entries last.
  const pendingDeletes = usePendingDeletes()
  const items = (data?.items ?? []).filter((x) => !pendingDeletes.has(x.id)).sort((x, y) =>
    dateSortKey(x.check_in).localeCompare(dateSortKey(y.check_in)),
  )

  return (
    <section aria-labelledby="stays-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="stays-heading" className="font-display text-xl font-extrabold text-foreground">
            Stays
          </h2>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "stay" : "stays"}
            </p>
          )}
        </div>
        <Button onClick={() => setSheet({ mode: "add" })}>
          <Plus aria-hidden="true" />
          Add stay
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3" aria-label="Loading stays">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="rounded-2xl bg-destructive-bg p-6 text-center text-sm text-destructive">
          Couldn&apos;t load stays. Check your connection and reload the page.
        </p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={Hotel}
          size="sm"
          title="No stays yet"
          description="Add where you're sleeping each night: hotels, hostels or apartments."
          className="rounded-2xl border-2 border-dashed bg-card/60"
        />
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <AccommodationCard
            key={a.id}
            accommodation={a}
            days={days}
            onEdit={() => setSheet({ mode: "edit", item: a })}
            onDelete={() =>
              scheduleDelete({
                id: a.id,
                message: "Stay deleted.",
                errorMessage: "Couldn’t delete this stay. It’s back in the list.",
                commit: () => deleteMut.mutateAsync(a.id),
              })
            }
          />
        ))}
      </div>

      <ResponsiveSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet?.mode === "edit" ? "Edit stay" : "Add stay"}
      >
        {sheet?.mode === "add" && (
          <AccommodationForm
            tripBaseCurrency={tripBaseCurrency}
            withCost
            defaultDate={tripStart}
            searchContext={destination}
            isSubmitting={createMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input: CreateAccommodationInput) => {
              await createMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
        {sheet?.mode === "edit" && (
          <AccommodationForm
            initial={sheet.item}
            defaultDate={tripStart}
            searchContext={destination}
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
