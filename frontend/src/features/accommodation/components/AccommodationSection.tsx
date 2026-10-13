"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Hotel, Plus } from "lucide-react"

import { ConfirmDialog } from "@/components/ConfirmDialog"
import { EmptyState } from "@/components/EmptyState"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
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
}

/** Stay list; add and edit open in a sheet (bottom sheet on phones). */
export function AccommodationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useAccommodations(tripId)
  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; item: Accommodation } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Accommodation | null>(null)

  const createMut = useCreateAccommodation(tripId)
  const updateMut = useUpdateAccommodation(sheet?.mode === "edit" ? sheet.item.id : "", tripId)
  const deleteMut = useDeleteAccommodation(tripId)

  const items = data?.items ?? []

  return (
    <section aria-labelledby="stays-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="stays-heading" className="text-lg font-semibold text-foreground">
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
        <p role="alert" className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
          Couldn&apos;t load stays. Check your connection and reload the page.
        </p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={Hotel}
          size="sm"
          title="No stays yet"
          description="Add where you're sleeping each night: hotels, hostels or apartments."
          className="rounded-xl border border-dashed"
        />
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <AccommodationCard
            key={a.id}
            accommodation={a}
            onEdit={() => setSheet({ mode: "edit", item: a })}
            onDelete={() => setConfirmingDelete(a)}
            isDeleting={deleteMut.isPending && confirmingDelete?.id === a.id}
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
            isSubmitting={updateMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input) => {
              await updateMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setConfirmingDelete(null)
        }}
        title={`Delete "${confirmingDelete?.name ?? ""}"?`}
        description="This stay will be removed from the trip."
        confirmLabel="Delete stay"
        destructive
        isPending={deleteMut.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (confirmingDelete && !deleteMut.isPending) {
            deleteMut.mutate(confirmingDelete.id, {
              onSuccess: () => {
                setConfirmingDelete(null)
                toast("Stay removed.")
              },
              onError: () => {
                toast("Couldn’t remove this stay. Please try again.", "error")
              },
            })
          }
        }}
      />
    </section>
  )
}
