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
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Plus, Sparkles } from "lucide-react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
  useUpdateActivity,
} from "../hooks/useActivities"
import { useDayTimeline } from "../hooks/useDayTimeline"
import { useActivitySelection } from "../hooks/useActivitySelection"
import type { Activity, ActivityListResponse, CreateActivityInput } from "../types"
import type { Day } from "@/features/trip/types"
import { ActivityForm } from "./ActivityForm"
import { DayAIPlanner } from "./DayAIPlanner"
import { ActivitySelectToolbar } from "./timeline/ActivitySelectToolbar"
import { SortableActivityRow } from "./timeline/SortableActivityRow"
import { StayTimelineCard } from "./timeline/StayTimelineCard"
import { TimelineDot } from "./timeline/TimelineDot"
import { TransportTimelineCard } from "./timeline/TransportTimelineCard"

interface Props {
  tripId: string
  dayId: string
  date: string
  dayNumber: number
  destination?: string
  days: Day[]
}

/**
 * One day's timeline: read-only transport/stay items, then the day's
 * activities (drag to reorder, select & copy to another day, edit inline),
 * the AI planner and the add-activity form.
 */
export function DayActivities({ tripId, dayId, date, dayNumber, destination, days }: Props) {
  const qc = useQueryClient()
  const { isLoading, activities, staticItems, overlapByActivity } = useDayTimeline(tripId, dayId, date)
  const selection = useActivitySelection(dayId, days, activities)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Activity | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [reorderKey, setReorderKey] = useState(0)

  const createMut = useCreateActivity(dayId, tripId)
  const updateMut = useUpdateActivity(editingId ?? "", dayId, tripId)
  const deleteMut = useDeleteActivity(dayId, tripId)
  const reorderMut = useReorderActivities(dayId, tripId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 pl-12 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 rounded-2xl border border-border/20 bg-muted/30 p-4 animate-pulse space-y-2">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = activities.findIndex((a) => a.id === active.id)
    const newIdx = activities.findIndex((a) => a.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(activities, oldIdx, newIdx)
    const newOrder = reordered.map((a) => a.id)

    // Defer to next frame: @dnd-kit resets internal transform state
    // asynchronously after onDragEnd. If setQueryData runs synchronously,
    // @dnd-kit's pending state reset may override our optimistic reorder.
    requestAnimationFrame(() => {
      qc.setQueryData<ActivityListResponse>(
        ["activities", "list", dayId],
        { items: reordered },
      )
      setReorderKey(k => k + 1)

      reorderMut.mutate({ ids: newOrder }, {
        onError: () => {
          qc.invalidateQueries({ queryKey: ["activities", "list", dayId], refetchType: 'active' })
        },
      })
    })
  }

  const hasContent = activities.length > 0 || staticItems.length > 0

  return (
    <div className="space-y-3">
      {activities.length > 0 && (
        <ActivitySelectToolbar
          selection={selection}
          activityCount={activities.length}
          dayId={dayId}
          days={days}
        />
      )}
      {overlapByActivity.size > 0 && (
        <div
          className="flex items-start gap-2 rounded-xl border border-chromatic-amber/25 bg-chromatic-amber/10 px-3 py-2.5 text-sm text-foreground"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chromatic-amber" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {overlapByActivity.size} activities have overlapping times
            </p>
            <p className="text-xs text-muted-foreground">
              Review the highlighted activities or keep them if the overlap is intentional.
            </p>
          </div>
        </div>
      )}
      {hasContent && (
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[18px] top-5 h-[calc(100%-1.25rem)] w-px bg-border/50" />

          {/* Static transport/accommodation items */}
          {staticItems.map((item) =>
            item.kind === "transport" ? (
              <div key={`trans-${item.data.id}`} className="relative mb-3 flex gap-2 pl-10 sm:gap-3 sm:pl-12">
                <div className="absolute left-0 top-5 -translate-y-1/2">
                  <TimelineDot kind="transport" transportType={item.data.type} />
                </div>
                <div className="flex-1">
                  <TransportTimelineCard t={item.data} />
                </div>
              </div>
            ) : (
              <div
                key={`accom-${item.data.id}-${item.event}`}
                className="relative mb-3 flex gap-2 pl-10 sm:gap-3 sm:pl-12"
              >
                <div className="absolute left-0 top-5 -translate-y-1/2">
                  <TimelineDot kind="accommodation" />
                </div>
                <div className="flex-1">
                  <StayTimelineCard a={item.data} event={item.event} />
                </div>
              </div>
            ),
          )}

          {/* Sortable activity items */}
          {activities.length > 0 && (
            <DndContext
              key={reorderKey}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={activities.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {activities.map((a) => (
                    <SortableActivityRow
                      key={a.id}
                      activity={a}
                      isEditing={editingId === a.id}
                      onEdit={() => setEditingId(a.id)}
                      onCancelEdit={() => setEditingId(null)}
                      isSubmitting={updateMut.isPending && editingId === a.id}
                      onSave={async (input) => {
                        await updateMut.mutateAsync({
                          title: input.title,
                          start_time: input.start_time,
                          end_time: input.end_time,
                          payload: input.payload,
                        })
                        setEditingId(null)
                      }}
                      onDelete={() => setConfirmingDelete(a)}
                      isDeleting={
                        deleteMut.isPending &&
                        confirmingDelete?.id === a.id
                      }
                      overlapTitles={overlapByActivity.get(a.id) ?? []}
                      selectMode={selection.selectMode}
                      isSelected={selection.selectedIds.has(a.id)}
                      onToggleSelect={() => selection.toggleSelect(a.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {activities.length < 6 && (
        <div className="relative pl-10 sm:pl-12">
          <div className="absolute left-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <DayAIPlanner
            tripId={tripId}
            dayId={dayId}
            date={date}
            dayNumber={dayNumber}
            destination={destination}
            existingCount={activities.length}
          />
        </div>
      )}

      {/* Inline Add Activity form */}
      <div className="relative pl-10 sm:pl-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-muted-foreground">
          <Plus className="h-4 w-4" />
        </div>

        {addOpen ? (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-md">
            <ActivityForm
              context={{ dayNumber, date, destination }}
              onCancel={() => setAddOpen(false)}
              isSubmitting={createMut.isPending}
              onSubmit={async (input: CreateActivityInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group flex w-full items-center gap-2 rounded-full border border-dashed border-border/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            Add activity to Day {dayNumber}
          </button>
        )}
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
        title={`Delete "${confirmingDelete?.title ?? ""}"?`}
        description="This activity will be permanently removed from the day."
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
