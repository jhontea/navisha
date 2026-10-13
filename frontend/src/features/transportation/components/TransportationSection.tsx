"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { EmptyState } from "@/components/EmptyState"
import {
  useCreateTransportation,
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { CreateTransportationInput, Transportation } from "../types"
import { TransportationCard } from "./TransportationCard"
import { Plane, Plus } from "lucide-react"
import { toast } from "@/lib/toast"

const TransportationForm = dynamic(
  () => import("./TransportationForm").then((module) => module.TransportationForm),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" /> },
)

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
    <div>
      <section>
        {/* List first; adding is a compact action next to the heading. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">Transport</h3>
            {!isLoading && !isError && items.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "entry" : "entries"}
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
              Add transport
            </button>
          )}
        </div>

        {addOpen && (
          <div className="mb-4 rounded-xl border bg-card p-4 shadow-card sm:p-6">
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
          </div>
        )}

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
            <div role="alert" className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive font-medium">Couldn&apos;t load transport.</p>
              <p className="text-xs text-muted-foreground mt-1">Check your connection and reload the page.</p>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && !addOpen && (
            <EmptyState
              icon={Plane}
              size="sm"
              title="No transport yet"
              description="Add flights, trains, buses, or transfers to see them in your itinerary."
              className="rounded-2xl border border-dashed border-border/50"
            />
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

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setConfirmingDelete(null)
        }}
        title={`Delete "${confirmingDelete?.label || confirmingDelete?.type || ""}"?`}
        description="This transportation entry will be permanently removed."
        confirmLabel="Delete"
        destructive
        isPending={deleteMut.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (confirmingDelete && !deleteMut.isPending) {
            deleteMut.mutate(confirmingDelete.id, {
              onSuccess: () => {
                setConfirmingDelete(null)
                toast("Transportation removed.")
              },
              onError: () => {
                toast("Couldn’t remove this transportation entry. Please try again.", "error")
              },
            })
          }
        }}
      />
    </div>
  )
}
