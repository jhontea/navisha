"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { EmptyState } from "@/components/EmptyState"
import {
  useAccommodations,
  useCreateAccommodation,
  useDeleteAccommodation,
  useUpdateAccommodation,
} from "../hooks/useAccommodations"
import type { Accommodation, CreateAccommodationInput } from "../types"
import { AccommodationCard } from "./AccommodationCard"
import { Hotel, Plus } from "lucide-react"
import { toast } from "@/lib/toast"

const AccommodationForm = dynamic(
  () => import("./AccommodationForm").then((module) => module.AccommodationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

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
    <div>
      <section>
        {/* List first; adding is a compact action next to the heading. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">Stays</h3>
            {!isLoading && !isError && items.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "stay" : "stays"}
              </p>
            )}
          </div>
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add stay
            </button>
          )}
        </div>

        {addOpen && (
          <div className="mb-4 rounded-xl border bg-card p-4 shadow-card sm:p-6">
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
          </div>
        )}

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
            <div role="alert" className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive font-medium">Couldn&apos;t load stays.</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection and reload the page.</p>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && !addOpen && (
            <EmptyState
              icon={Hotel}
              size="sm"
              title="No stays yet"
              description="Add where you're sleeping each night: hotels, hostels, or apartments."
              className="rounded-2xl border border-dashed border-border/50"
            />
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

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setConfirmingDelete(null)
        }}
        title={`Delete "${confirmingDelete?.name ?? ""}"?`}
        description="This stay will be permanently removed from the trip."
        confirmLabel="Delete"
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
    </div>
  )
}
