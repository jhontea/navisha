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
  useAccommodations,
  useCreateAccommodation,
  useDeleteAccommodation,
  useUpdateAccommodation,
} from "../hooks/useAccommodations"
import type { Accommodation, CreateAccommodationInput } from "../types"
import { AccommodationCard } from "./AccommodationCard"
import { AccommodationForm } from "./AccommodationForm"

interface Props {
  tripId: string
}

export function AccommodationSection({ tripId }: Props) {
  const { data, isLoading, isError } = useAccommodations(tripId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Accommodation | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Accommodation | null>(null)

  const createMut = useCreateAccommodation(tripId)
  const updateMut = useUpdateAccommodation(editing?.id ?? "", tripId)
  const deleteMut = useDeleteAccommodation(tripId)

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Stays · {items.length}
        </h3>
        <Button size="sm" onClick={() => setCreating(true)}>
          + Add stay
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-xs text-destructive">Failed to load.</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No stays logged yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <AccommodationCard
            key={a.id}
            accommodation={a}
            onEdit={() => setEditing(a)}
            onDelete={() => setConfirmingDelete(a)}
            isDeleting={deleteMut.isPending && deleteMut.variables === a.id}
          />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New stay</DialogTitle>
          </DialogHeader>
          <AccommodationForm
            isSubmitting={createMut.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input: CreateAccommodationInput) => {
              await createMut.mutateAsync(input)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit stay</DialogTitle>
          </DialogHeader>
          {editing && (
            <AccommodationForm
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
