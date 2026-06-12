"use client"

import { useState } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
  useUpdateActivity,
} from "../hooks/useActivities"
import type { Activity, CreateActivityInput } from "../types"
import { ActivityForm } from "./ActivityForm"
import { SortableActivityCard } from "./SortableActivityCard"

interface Props {
  dayId: string
}

export function DayActivities({ dayId }: Props) {
  const { data, isLoading, isError } = useActivities(dayId)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)

  const createMut = useCreateActivity(dayId)
  const updateMut = useUpdateActivity(editing?.id ?? "", dayId)
  const deleteMut = useDeleteActivity(dayId)
  const reorderMut = useReorderActivities(dayId)

  // PointerSensor with distance constraint: tiny clicks don't start a drag,
  // so the grip handle still works for taps and the rest of the card stays
  // clickable for edit.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading…</p>
  }
  if (isError) {
    return <p className="text-xs text-destructive">Failed to load activities.</p>
  }

  const items = data?.items ?? []

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((a) => a.id === active.id)
    const newIdx = items.findIndex((a) => a.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const newOrder = arrayMove(items, oldIdx, newIdx).map((a) => a.id)
    reorderMut.mutate({ ids: newOrder })
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No activities yet for this day.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((a, i) => (
              <SortableActivityCard
                key={a.id}
                activity={a}
                index={i}
                onEdit={() => setEditing(a)}
                onDelete={() => {
                  if (confirm(`Delete "${a.title}"?`)) deleteMut.mutate(a.id)
                }}
                isDeleting={
                  deleteMut.isPending && deleteMut.variables === a.id
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setCreating(true)}
      >
        + Add activity
      </Button>

      <Dialog
        open={creating}
        onOpenChange={(o) => !o && setCreating(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            onCancel={() => setCreating(false)}
            isSubmitting={createMut.isPending}
            onSubmit={async (input: CreateActivityInput) => {
              await createMut.mutateAsync(input)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit activity</DialogTitle>
          </DialogHeader>
          {editing && (
            <ActivityForm
              initial={editing}
              lockType
              onCancel={() => setEditing(null)}
              isSubmitting={updateMut.isPending}
              onSubmit={async (input) => {
                await updateMut.mutateAsync({
                  title: input.title,
                  start_time: input.start_time,
                  end_time: input.end_time,
                  payload: input.payload,
                })
                setEditing(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
