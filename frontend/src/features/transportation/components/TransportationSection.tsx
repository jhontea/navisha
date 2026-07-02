"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useCreateTransportation,
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { CreateTransportationInput, Transportation } from "../types"
import { TransportationForm } from "./TransportationForm"
import { TransportationCard } from "./TransportationCard"
import { Plane, Plus } from "lucide-react"

interface Props {
  tripId: string
  tripBaseCurrency: string
}

export function TransportationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useTransportations(tripId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Transportation | null>(null)

  const createMut = useCreateTransportation(tripId)
  const updateMut = useUpdateTransportation(editingId ?? "", tripId)
  const deleteMut = useDeleteTransportation(tripId)

  const items = data?.items ?? []

  return (
    <div className="space-y-10">
      {/* Add Transportation Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-1">
            Add Transportation
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your flights, trains, and transfers to keep your itinerary organized.
          </p>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-8">
          {addOpen ? (
            <TransportationForm
              tripBaseCurrency={tripBaseCurrency}
              withCost
              isSubmitting={createMut.isPending}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (input: CreateTransportationInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-md shadow-primary/20">
                <Plane className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Log a transportation
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add flights, trains, buses, or any other transport
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean px-6 py-2.5 font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/35 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-4 w-4" />
                Add Transport
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Travel List */}
      {(isLoading || items.length > 0 || isError) && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Upcoming Travel
            </h3>
            {!isLoading && (
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border/20 bg-card p-5 animate-pulse overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted rounded-l-2xl" />
                  <div className="pl-2 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded bg-muted" />
                      <div className="h-4 w-48 rounded bg-muted" />
                      <div className="h-3 w-32 rounded bg-muted" />
                    </div>
                    <div className="hidden lg:flex flex-col gap-1.5 shrink-0">
                      <div className="h-3 w-16 rounded bg-muted" />
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive font-medium">Failed to load transportation entries.</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No transportation logged yet.</p>
            </div>
          )}

          <div className="space-y-3">
            {items.map((t) => {
              const isEditing = editingId === t.id

              if (isEditing) {
                return (
                  <div key={t.id} className="rounded-2xl border border-border/40 bg-card p-6 shadow-md">
                    <TransportationForm
                      initial={t}
                      lockType
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
                <TransportationCard
                  key={t.id}
                  transportation={t}
                  onEdit={() => setEditingId(t.id)}
                  onDelete={() => setConfirmingDelete(t)}
                  isDeleting={deleteMut.isPending && confirmingDelete?.id === t.id}
                />
              )
            })}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
        title={`Delete "${confirmingDelete?.label || confirmingDelete?.type || ""}"?`}
        description="This transportation entry will be permanently removed."
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
