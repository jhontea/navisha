"use client"

import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ChevronDown, Hotel, PenLine, Plane, Plus, Sparkles } from "lucide-react"

import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { sheetCloseAction } from "@/lib/discardGuard"
import { TimePills, type TimePill } from "@/components/TimePills"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import { toast } from "@/lib/toast"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddStaySheet } from "@/features/accommodation/components/AddStaySheet"
import { AddTransportationSheet } from "@/features/transportation/components/AddTransportationSheet"
import type { Day } from "@/features/trip/types"
import {
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
  useToggleTodoItem,
  useUpdateActivity,
} from "../hooks/useActivities"
import { useDayTimeline } from "../hooks/useDayTimeline"
import { useActivitySelection } from "../hooks/useActivitySelection"
import { useItineraryFocus } from "../ItineraryFocus"
import { reorderAnnouncements, reorderInstructions } from "../lib/order"
import { extractTime, interleaveTimeline } from "../lib/timeline"
import type { Activity, ActivityListResponse, CreateActivityInput } from "../types"
import { ActivityForm } from "./ActivityForm"
import { DayAIPlanner } from "./DayAIPlanner"
import { ActivitySelectToolbar } from "./timeline/ActivitySelectToolbar"
import { SortableActivityRow, dragHandleId } from "./timeline/SortableActivityRow"
import { StayTimelineCard } from "./timeline/StayTimelineCard"
import { TimelineIcon } from "./timeline/TimelineIcon"
import { TimelineRow } from "./timeline/TimelineRow"
import { TransportTimelineCard } from "./timeline/TransportTimelineCard"

interface Props {
  tripId: string
  dayId: string
  date: string
  dayNumber: number
  destination?: string
  tripBaseCurrency: string
  days: Day[]
  /** Select & copy mode, turned on from the day header menu. */
  selectMode: boolean
  onSelectModeChange: (on: boolean) => void
}

const MENU_ITEM = "min-h-14 gap-3 px-2.5 py-2"
const DAY_ACTIONS = [
  { mode: "add", icon: PenLine, title: "Add activity", hint: () => "A place, a note, or a to-do list" },
  { mode: "ai", icon: Sparkles, title: "Suggest with AI", hint: (hasPlan: boolean) => (hasPlan ? "Fill the gaps around your plan" : "Get a balanced day to review") },
  { mode: "transport", icon: Plane, title: "Add transport", hint: () => "A flight, train, bus or transfer" },
  { mode: "stay", icon: Hotel, title: "Add stay", hint: () => "A hotel, hostel or apartment" },
] as const
const MENU_ICON = "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground"

/**
 * One day's timeline: activities in their saved order with transport and
 * stays placed between them by time, plus Add (manual or AI) in sheets.
 */
export function DayActivities({
  tripId,
  dayId,
  date,
  dayNumber,
  destination,
  tripBaseCurrency,
  days,
  selectMode,
  onSelectModeChange,
}: Props) {
  const qc = useQueryClient()
  const timeline = useDayTimeline(tripId, dayId, date)
  const { isLoading, staticItems, overlapByActivity } = timeline
  const pendingDeletes = usePendingDeletes()
  const activities = timeline.activities.filter((a) => !pendingDeletes.has(a.id))
  const selection = useActivitySelection(dayId, days, activities, selectMode, onSelectModeChange)
  const { selectedActivityId, selectActivity } = useItineraryFocus()

  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; activity: Activity } | { mode: "ai" } | { mode: "transport" } | { mode: "stay" } | null>(null)
  const [reorderKey, setReorderKey] = useState(0)
  // The DndContext remounts after a drop; keyboard users get focus back on
  // the handle they moved so they can keep reordering.
  const refocusIdRef = useRef<string | null>(null)
  // dnd-kit's own live region goes with the remount, so the drop is announced here.
  const [dropStatus, setDropStatus] = useState("")
  const [timeFocus, setTimeFocus] = useState<string | null>(null)
  // Closing the activity sheet with X / Escape asks first when input was typed.
  const [formDirty, setFormDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const closeSheet = () => {
    setSheet(null)
    setFormDirty(false)
    setConfirmDiscard(false)
  }
  const requestCloseFormSheet = () => {
    if (sheetCloseAction(formDirty) === "confirm") setConfirmDiscard(true)
    else closeSheet()
  }

  const createMut = useCreateActivity(dayId, tripId)
  const toggleTodo = useToggleTodoItem(dayId, tripId)
  const updateMut = useUpdateActivity(sheet?.mode === "edit" ? sheet.activity.id : "", dayId, tripId)
  const deleteMut = useDeleteActivity(dayId, tripId)
  const reorderMut = useReorderActivities(dayId, tripId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // When an activity of this day is picked on the map, bring its card into view.
  useEffect(() => {
    if (!selectedActivityId || !activities.some((a) => a.id === selectedActivityId)) return
    document.getElementById(`activity-${selectedActivityId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedActivityId, activities])

  // After a keyboard reorder the list remounts (key={reorderKey}); give focus
  // back to the moved item's handle.
  useEffect(() => {
    const id = refocusIdRef.current
    if (!id) return
    refocusIdRef.current = null
    document.getElementById(dragHandleId(id))?.focus({ preventScroll: true })
  }, [reorderKey])

  if (isLoading) {
    return (
      <div className="space-y-3 py-2" aria-label="Loading day activities">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const keyboard = e.activatorEvent instanceof KeyboardEvent
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
      qc.setQueryData<ActivityListResponse>(["activities", "list", dayId], { items: reordered })
      setReorderKey((k) => k + 1)
      if (keyboard) refocusIdRef.current = String(active.id)
      setDropStatus(`${activities[oldIdx].title} moved to position ${newIdx + 1} of ${activities.length}.`)
      reorderMut.mutate(
        { ids: newOrder },
        {
          onError: () => {
            qc.invalidateQueries({ queryKey: ["activities", "list", dayId], refetchType: "active" })
          },
        },
      )
    })
  }

  const entries = interleaveTimeline(activities, staticItems)

  // Phone shortcut: one pill per timed entry, jumps to it (the map does this on desktop).
  const hhmm = (value?: string | null) => (value ? value.slice(0, 5) : null)
  const timePills: TimePill[] = entries.flatMap((entry): TimePill[] => {
    if (entry.kind === "activity") {
      const start = hhmm(entry.activity.start_time)
      if (!start) return []
      const end = hhmm(entry.activity.end_time)
      return [{ id: `activity-${entry.activity.id}`, label: end ? `${start} – ${end}` : start, description: entry.activity.title }]
    }
    if (entry.kind === "transport") {
      const dep = extractTime(entry.data.departure_datetime)
      return dep ? [{ id: `trans-${entry.data.id}`, label: dep, description: entry.data.label || entry.data.to_location }] : []
    }
    return []
  })
  const jumpTo = (elementId: string) => {
    setTimeFocus(elementId)
    if (elementId.startsWith("activity-")) selectActivity(elementId.slice("activity-".length))
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">
        {dropStatus}
      </p>
      {selectMode && activities.length > 0 && (
        <ActivitySelectToolbar selection={selection} activityCount={activities.length} dayId={dayId} days={days} />
      )}

      {overlapByActivity.size > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning-bg px-3 py-2.5 text-sm text-foreground" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            <span className="font-medium">{overlapByActivity.size} activities overlap in time.</span>{" "}
            <span className="text-muted-foreground">Keep them if that is intentional.</span>
          </p>
        </div>
      )}

      {timePills.length >= 2 && !selectMode && (
        <TimePills className="lg:hidden" aria-label={`Times on Day ${dayNumber}`} items={timePills} value={timeFocus} onChange={jumpTo} />
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl bg-muted px-3 py-4 text-center">
          <p className="text-sm text-muted-foreground">Nothing planned for this day yet.</p>
          {!selectMode && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DAY_ACTIONS.map(({ mode, icon: Icon, title }) => (
                <Button key={mode} variant="outline" className="min-w-0 bg-card" onClick={() => setSheet({ mode })}>
                  <Icon aria-hidden="true" />
                  {title}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DndContext
          key={reorderKey}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{ announcements: reorderAnnouncements(activities), screenReaderInstructions: reorderInstructions }}
        >
          <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div>
              {entries.map((entry) => {
                if (entry.kind === "activity") {
                  const a = entry.activity
                  return (
                    <SortableActivityRow
                      key={a.id}
                      activity={a}
                      onEdit={() => setSheet({ mode: "edit", activity: a })}
                      onDelete={() =>
                        scheduleDelete({
                          id: a.id,
                          message: "Activity deleted.",
                          errorMessage: "Couldn’t delete this activity. It’s back on the day.",
                          commit: () => deleteMut.mutateAsync(a.id),
                        })
                      }
                      onToggleTodo={(itemId) =>
                        toggleTodo.mutate(
                          { activity: a, itemId },
                          { onError: () => toast("Couldn’t update this to-do. Try again.", "error") },
                        )
                      }
                      overlapTitles={overlapByActivity.get(a.id) ?? []}
                      selectMode={selectMode}
                      isSelected={selection.selectedIds.has(a.id)}
                      onToggleSelect={() => selection.toggleSelect(a.id)}
                      isFocused={selectedActivityId === a.id}
                      onFocus={() => selectActivity(selectedActivityId === a.id ? null : a.id)}
                    />
                  )
                }
                if (entry.kind === "transport") {
                  return (
                    <TimelineRow
                      key={`trans-${entry.data.id}`}
                      id={`trans-${entry.data.id}`}
                      time={extractTime(entry.data.departure_datetime)}
                      icon={<TimelineIcon kind="transport" transportType={entry.data.type} />}
                    >
                      <TransportTimelineCard t={entry.data} />
                    </TimelineRow>
                  )
                }
                return (
                  <TimelineRow
                    key={`accom-${entry.data.id}-${entry.event}`}
                    time={entry.at ?? null}
                    icon={<TimelineIcon kind="stay" />}
                  >
                    <StayTimelineCard a={entry.data} event={entry.event} at={entry.at} />
                  </TimelineRow>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!selectMode && entries.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "soft", className: "w-full justify-center" })}>
            <Plus aria-hidden="true" />
            Add to Day {dayNumber}
            <ChevronDown className="opacity-70" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
            {DAY_ACTIONS.map(({ mode, icon: Icon, title, hint }) => (
              <DropdownMenuItem key={mode} className={MENU_ITEM} onClick={() => setSheet({ mode })}>
                <span className={MENU_ICON}>
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-bold text-foreground">{title}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{hint(activities.length > 0)}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ResponsiveSheet
        open={sheet?.mode === "add" || sheet?.mode === "edit"}
        onOpenChange={(open) => !open && requestCloseFormSheet()}
        title={sheet?.mode === "edit" ? "Edit activity" : `Add activity to Day ${dayNumber}`}
      >
        {sheet?.mode === "add" && (
          <ActivityForm
            context={{ dayNumber, date, destination }}
            onCancel={closeSheet}
            onDirtyChange={setFormDirty}
            isSubmitting={createMut.isPending}
            onSubmit={async (input: CreateActivityInput) => {
              await createMut.mutateAsync(input)
              closeSheet()
            }}
          />
        )}
        {sheet?.mode === "edit" && (
          <ActivityForm
            initial={sheet.activity}
            lockType
            onCancel={closeSheet}
            onDirtyChange={setFormDirty}
            isSubmitting={updateMut.isPending}
            onSubmit={async (input: CreateActivityInput) => {
              await updateMut.mutateAsync({
                title: input.title,
                start_time: input.start_time,
                end_time: input.end_time,
                payload: input.payload,
              })
              closeSheet()
            }}
          />
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={sheet?.mode === "edit" ? "Discard your changes?" : "Discard this activity?"}
        description="What you typed will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={closeSheet}
      />

      <AddTransportationSheet
        tripId={tripId}
        tripBaseCurrency={tripBaseCurrency}
        open={sheet?.mode === "transport"}
        onOpenChange={(open) => !open && setSheet(null)}
        defaultDeparture={`${date}T00:00`}
      />
      <AddStaySheet
        tripId={tripId}
        tripBaseCurrency={tripBaseCurrency}
        open={sheet?.mode === "stay"}
        onOpenChange={(open) => !open && setSheet(null)}
        days={days}
        checkIn={date}
        destination={destination}
      />

      <ResponsiveSheet
        open={sheet?.mode === "ai"}
        onOpenChange={(open) => !open && setSheet(null)}
        title={`Suggest activities for Day ${dayNumber}`}
        description="Suggestions are only added after you review and pick them."
      >
        {sheet?.mode === "ai" && (
          <DayAIPlanner
            tripId={tripId}
            dayId={dayId}
            date={date}
            dayNumber={dayNumber}
            destination={destination}
            existingCount={activities.length}
            defaultOpen
            onClose={() => setSheet(null)}
          />
        )}
      </ResponsiveSheet>

    </div>
  )
}
