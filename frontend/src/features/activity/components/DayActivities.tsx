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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowRight,
  Bus,
  Car,
  GripVertical,
  Hotel,
  Plane,
  Plus,
  Ship,
  Train,
  TramFront,
  Boxes,
  LogIn,
  LogOut,
} from "lucide-react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { cn } from "@/lib/utils"
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
  useUpdateActivity,
} from "../hooks/useActivities"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import type { Activity, ActivityListResponse, CreateActivityInput } from "../types"
import type { Transportation } from "@/features/transportation/types"
import type { Accommodation } from "@/features/accommodation/types"
import { ActivityCard } from "./ActivityCard"
import { ActivityForm } from "./ActivityForm"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimelineItem =
  | { kind: "activity"; data: Activity }
  | { kind: "transport"; data: Transportation }
  | { kind: "accommodation"; data: Accommodation; event: "check_in" | "check_out" }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract "HH:MM" literally from an ISO datetime string — no timezone conversion.
 * DB stores "2026-05-10T06:30:00+00:00". User entered 06:30 and expects to see 06:30.
 * So we read T<HH>:<MM> directly from the string.
 */
function extractTime(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}

/**
 * Extract "YYYY-MM-DD" literally from a datetime string — no timezone conversion.
 * Reads the date portion before the T, so "2026-05-10T06:30:00+00:00" → "2026-05-10".
 */
function extractDate(v: string | null | undefined): string | null {
  if (!v) return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function toSortKey(v: string | null | undefined): string {
  if (!v) return "99:99"
  if (v.includes("T")) {
    const t = extractTime(v)
    if (t) return t
  }
  return v
}

function dateMatches(
  datetimeStr: string | null | undefined,
  date: string,
): boolean {
  if (!datetimeStr) return false
  if (datetimeStr.length === 10) return datetimeStr === date
  return extractDate(datetimeStr) === date
}

// ---------------------------------------------------------------------------
// Transport icon map
// ---------------------------------------------------------------------------

const TRANSPORT_ICON: Record<string, typeof Plane> = {
  flight: Plane,
  bus: Bus,
  train: Train,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

// ---------------------------------------------------------------------------
// Read-only timeline cards (transport & accommodation)
// ---------------------------------------------------------------------------

function TransportTimelineCard({ t }: { t: Transportation }) {
  const Icon = TRANSPORT_ICON[t.type] ?? Boxes
  const depTime = extractTime(t.departure_datetime)
  const arrTime = extractTime(t.arrival_datetime)

  return (
    <div className="rounded-2xl border-l-4 border-l-primary border border-border/30 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Transport
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-primary">
              <Icon className="h-3 w-3" />
              {t.type}
            </span>
            {depTime && (
              <span className="text-xs text-muted-foreground">· {depTime}</span>
            )}
          </div>
          {(t.from_location || t.to_location) && (
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span>{t.from_location || "—"}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{t.to_location || "—"}</span>
            </div>
          )}
          {t.label && (
            <p className="text-sm text-foreground/80">{t.label}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {t.operator && <span>{t.operator}</span>}
            {t.reference_number && <span className="font-mono">#{t.reference_number}</span>}
            {depTime && arrTime && <span>{depTime} → {arrTime}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function AccommodationTimelineCard({
  a,
  event,
}: {
  a: Accommodation
  event: "check_in" | "check_out"
}) {
  const isCheckin = event === "check_in"
  const EventIcon = isCheckin ? LogIn : LogOut

  return (
    <div className="rounded-2xl border-l-4 border-l-chromatic-aurora border border-border/30 bg-chromatic-aurora/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-chromatic-aurora">
              Stay
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                isCheckin
                  ? "bg-chromatic-aurora/10 text-chromatic-aurora"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <EventIcon className="h-3 w-3" />
              {isCheckin ? "Check-in" : "Check-out"}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground">{a.name}</h4>
          {a.location_name && (
            <p className="text-xs text-muted-foreground">{a.location_name}</p>
          )}
          {a.confirmation_number && (
            <p className="text-xs font-mono text-muted-foreground">#{a.confirmation_number}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline dot
// ---------------------------------------------------------------------------

function TimelineDot({
  kind,
  activityType,
  transportType,
}: {
  kind: "activity" | "transport" | "accommodation"
  activityType?: string
  transportType?: string
  accommodationEvent?: "check_in" | "check_out"
}) {
  if (kind === "transport") {
    const Icon = TRANSPORT_ICON[transportType ?? "other"] ?? Boxes
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background bg-[#DBEAFE] text-primary">
        <Icon className="h-4 w-4" />
      </div>
    )
  }
  if (kind === "accommodation") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background bg-[#EDE9FE] text-[#7C3AED]">
        <Hotel className="h-4 w-4" />
      </div>
    )
  }
  const bgMap: Record<string, string> = {
    location: "bg-[#DBEAFE] text-primary",
    note: "bg-chromatic-amber/10 text-chromatic-amber",
    todo: "bg-muted text-muted-foreground",
  }
  const bg = bgMap[activityType ?? "location"] ?? bgMap.location
  if (activityType === "note") {
    return (
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><polyline points="15 3 15 9 21 9"/></svg>
      </div>
    )
  }
  if (activityType === "todo") {
    return (
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
      </div>
    )
  }
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable activity row (drag-to-reorder)
// ---------------------------------------------------------------------------

interface SortableRowProps {
  activity: Activity
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (input: Parameters<typeof useCreateActivity>[0] extends string ? CreateActivityInput : CreateActivityInput) => Promise<void>
  isSubmitting: boolean
  onDelete: () => void
  isDeleting: boolean
}

function SortableActivityRow({
  activity,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  isSubmitting,
  onDelete,
  isDeleting,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative flex gap-3 pl-12", isDragging && "opacity-50 z-50")}
    >
      {/* Timeline dot */}
      <div className="absolute left-0 top-5 -translate-y-1/2">
        <TimelineDot kind="activity" activityType={activity.type} />
      </div>

      <div className="flex flex-1 items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          className="mt-3 flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1">
          {isEditing ? (
            <div className="rounded-2xl border bg-card p-5 shadow-lg">
              <ActivityForm
                initial={activity}
                lockType
                onCancel={onCancelEdit}
                isSubmitting={isSubmitting}
                onSubmit={onSave}
              />
            </div>
          ) : (
            <ActivityCard
              activity={activity}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  tripId: string
  dayId: string
  date: string
}

export function DayActivities({ tripId, dayId, date }: Props) {
  const qc = useQueryClient()
  const { data: activitiesData, isLoading: loadingAct } = useActivities(dayId)
  const { data: transData } = useTransportations(tripId)
  const { data: accomData } = useAccommodations(tripId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Activity | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [reorderKey, setReorderKey] = useState(0)

  const createMut = useCreateActivity(dayId)
  const updateMut = useUpdateActivity(editingId ?? "", dayId)
  const deleteMut = useDeleteActivity(dayId)
  const reorderMut = useReorderActivities(dayId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  if (loadingAct) {
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

  const activities = activitiesData?.items ?? []
  const transportations = transData?.items ?? []
  const accommodations = accomData?.items ?? []

  // Build non-activity timeline items
  const staticItems: TimelineItem[] = []
  for (const t of transportations) {
    if (dateMatches(t.departure_datetime, date)) {
      staticItems.push({ kind: "transport", data: t })
    }
  }
  for (const a of accommodations) {
    if (dateMatches(a.check_in, date)) {
      staticItems.push({ kind: "accommodation", data: a, event: "check_in" })
    }
    if (dateMatches(a.check_out, date)) {
      staticItems.push({ kind: "accommodation", data: a, event: "check_out" })
    }
  }
  staticItems.sort((a, b) => {
    const ta =
      a.kind === "transport"
        ? toSortKey(a.data.departure_datetime)
        : a.kind === "accommodation" && a.event === "check_in"
          ? "14:00"
          : "12:00"
    const tb =
      b.kind === "transport"
        ? toSortKey(b.data.departure_datetime)
        : b.kind === "accommodation" && b.event === "check_in"
          ? "14:00"
          : "12:00"
    return ta.localeCompare(tb)
  })

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
          qc.invalidateQueries({ queryKey: ["activities", "list", dayId], refetchType: 'all' })
        },
      })
    })
  }

  const hasContent = activities.length > 0 || staticItems.length > 0

  return (
    <div className="space-y-3">
      {hasContent && (
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[18px] top-5 h-[calc(100%-1.25rem)] w-px bg-border/50" />

          {/* Static transport/accommodation items */}
          {staticItems.map((item) => {
            if (item.kind === "transport") {
              const t = item.data as Transportation
              return (
                <div key={`trans-${t.id}`} className="relative mb-3 flex gap-3 pl-12">
                  <div className="absolute left-0 top-5 -translate-y-1/2">
                    <TimelineDot kind="transport" transportType={t.type} />
                  </div>
                  <div className="flex-1">
                    <TransportTimelineCard t={t} />
                  </div>
                </div>
              )
            }
            if (item.kind === "accommodation") {
              const a = item.data as Accommodation
              return (
                <div
                  key={`accom-${a.id}-${item.event}`}
                  className="relative mb-3 flex gap-3 pl-12"
                >
                  <div className="absolute left-0 top-5 -translate-y-1/2">
                    <TimelineDot kind="accommodation" />
                  </div>
                  <div className="flex-1">
                    <AccommodationTimelineCard a={a} event={item.event} />
                  </div>
                </div>
              )
            }
            return null
          })}

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
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Inline Add Activity form */}
      <div className="relative pl-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-muted-foreground">
          <Plus className="h-4 w-4" />
        </div>

        {addOpen ? (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-md">
            <ActivityForm
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
            className="group flex w-full items-center gap-2 rounded-2xl border border-dashed border-border/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            Add activity
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
