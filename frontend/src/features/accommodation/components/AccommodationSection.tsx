"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useAccommodations,
  useCreateAccommodation,
  useDeleteAccommodation,
  useUpdateAccommodation,
} from "../hooks/useAccommodations"
import type { Accommodation, CreateAccommodationInput } from "../types"
import { AccommodationForm } from "./AccommodationForm"
import { AccommodationCard } from "./AccommodationCard"
import { Hotel, Plus } from "lucide-react"

interface Props {
  tripId: string
  tripBaseCurrency: string
}

export function AccommodationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useAccommodations(tripId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Accommodation | null>(null)

  const createMut = useCreateAccommodation(tripId)
  const updateMut = useUpdateAccommodation(editingId ?? "", tripId)
  const deleteMut = useDeleteAccommodation(tripId)

  const items = data?.items ?? []

  return (
    <div className="space-y-10">
      {/* Add Stay Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-1">
            Add Accommodation
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your hotels, hostels, and apartments to keep everything organized.
          </p>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-8">
          {addOpen ? (
            <AccommodationForm
              tripBaseCurrency={tripBaseCurrency}
              withCost
              isSubmitting={createMut.isPending}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (input: CreateAccommodationInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-chromatic-aurora/15">
                <Hotel className="h-7 w-7 text-chromatic-aurora" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Log a stay
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add hotels, hostels, apartments, or any other accommodation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-4 w-4" />
                Add Stay
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Planned Stays List */}
      {(isLoading || items.length > 0 || isError) && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Planned Stays
            </h3>
            {!isLoading && (
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "stay" : "stays"}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border/20 bg-card p-5 animate-pulse overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-chromatic-aurora/20 rounded-l-2xl" />
                  <div className="pl-2 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-12 rounded bg-muted" />
                      <div className="h-4 w-48 rounded bg-muted" />
                      <div className="h-3 w-36 rounded bg-muted" />
                      <div className="h-3 w-28 rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive font-medium">Failed to load stays.</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No stays logged yet.</p>
            </div>
          )}

          <div className="space-y-3">
            {items.map((a) => {
              const isEditing = editingId === a.id

              if (isEditing) {
                return (
                  <div key={a.id} className="rounded-2xl border border-border/40 bg-card p-6 shadow-md">
                    <AccommodationForm
                      initial={a}
                      isSubmitting={updateMut.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        await updateMut.mutateAsync(input)
                        setEditingId(null)
                      }}
                    />
                  </div>
                )
              }

              return (
                <AccommodationCard
                  key={a.id}
                  accommodation={a}
                  onEdit={() => setEditingId(a.id)}
                  onDelete={() => setConfirmingDelete(a)}
                  isDeleting={deleteMut.isPending && confirmingDelete?.id === a.id}
                />
              )
            })}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
        title={`Delete "${confirmingDelete?.name ?? ""}"?`}
        description="This stay will be permanently removed from the trip."
        confirmLabel="Delete"
        destructive
        isPending={deleteMut.isPending}
        onConfirm={() => {
          if (confirmingDelete) {
            deleteMut.mutate(confirmingDelete.id, {
              onSettled: () => setConfirmingDelete(null),
            })
          }
        }}
      />
    </div>
  )
}
