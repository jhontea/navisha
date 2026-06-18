"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useCreateTransportation,
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { CreateTransportationInput, Transportation } from "../types"
import { TransportationCard } from "./TransportationCard"
import { TransportationForm } from "./TransportationForm"

interface Props {
  tripId: string
  // Used for the optional cost field default + auto-created expense category.
  tripBaseCurrency: string
}

export function TransportationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useTransportations(tripId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Transportation | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Transportation | null>(null)

  const createMut = useCreateTransportation(tripId)
  const updateMut = useUpdateTransportation(editing?.id ?? "", tripId)
  const deleteMut = useDeleteTransportation(tripId)

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Transportation · {items.length}
        </h3>
        <Button size="sm" onClick={() => setCreating(true)}>
          + Add transport
        </Button>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading…</p>
      )}
      {isError && (
        <p className="text-xs text-destructive">Failed to load.</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No transportation logged yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((t) => (
          <TransportationCard
            key={t.id}
            transportation={t}
            onEdit={() => setEditing(t)}
            onDelete={() => setConfirmingDelete(t)}
            isDeleting={deleteMut.isPending && deleteMut.variables === t.id}
          />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New transportation</DialogTitle>
          </DialogHeader>
          <TransportationForm
            tripBaseCurrency={tripBaseCurrency}
            withCost
            isSubmitting={createMut.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input: CreateTransportationInput) => {
              // Backend creates the linked expense atomically via input.cost.
              await createMut.mutateAsync(input)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transportation</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransportationForm
              initial={editing}
              isSubmitting={updateMut.isPending}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                await updateMut.mutateAsync(input)
                setEditing(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
