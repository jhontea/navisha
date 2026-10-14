"use client"

import { useEffect, useState } from "react"
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
import { AlertTriangle, ChevronDown, PenLine, Plus, Sparkles } from "lucide-react"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { TimePills, type TimePill } from "@/components/TimePills"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Day } from "@/features/trip/types"
import {
  useCreateActivity,
  useDeleteActivity,
  useReorderActivities,
  useUpdateActivity,
} from "../hooks/useActivities"
import { useDayTimeline } from "../hooks/useDayTimeline"
import { useActivitySelection } from "../hooks/useActivitySelection"
import { useItineraryFocus } from "../ItineraryFocus"
import { extractTime, interleaveTimeline } from "../lib/timeline"
import type { Activity, ActivityListResponse, CreateActivityInput } from "../types"
import { ActivityForm } from "./ActivityForm"
import { DayAIPlanner } from "./DayAIPlanner"
import { ActivitySelectToolbar } from "./timeline/ActivitySelectToolbar"
import { SortableActivityRow } from "./timeline/SortableActivityRow"
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
  days: Day[]
  /** Select & copy mode, turned on from the day header menu. */
  selectMode: boolean
  onSelectModeChange: (on: boolean) => void
}

const MENU_ITEM = "min-h-14 gap-3 px-2.5 py-2"
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

  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; activity: Activity } | { mode: "ai" } | null>(null)
  const [reorderKey, setReorderKey] = useState(0)
  const [timeFocus, setTimeFocus] = useState<string | null>(null)

  const createMut = useCreateActivity(dayId, tripId)
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
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">Nothing planned for this day yet.</p>
      ) : (
        <DndContext key={reorderKey} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
                    time={null}
                    icon={<TimelineIcon kind="stay" />}
                  >
                    <StayTimelineCard a={entry.data} event={entry.event} />
                  </TimelineRow>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!selectMode && (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "soft", className: "w-full justify-center" })}>
            <Plus aria-hidden="true" />
            Add to Day {dayNumber}
            <ChevronDown className="opacity-70" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
            <DropdownMenuItem className={MENU_ITEM} onClick={() => setSheet({ mode: "add" })}>
              <span className={MENU_ICON}>
                <PenLine aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-foreground">Add activity</span>
                <span className="block text-xs font-normal text-muted-foreground">A place, a note, or a to-do list</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => setSheet({ mode: "ai" })}>
              <span className={MENU_ICON}>
                <Sparkles aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-foreground">Suggest with AI</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {activities.length > 0 ? "Fill the gaps around your plan" : "Get a balanced day to review"}
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ResponsiveSheet
        open={sheet?.mode === "add" || sheet?.mode === "edit"}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet?.mode === "edit" ? "Edit activity" : `Add activity to Day ${dayNumber}`}
      >
        {sheet?.mode === "add" && (
          <ActivityForm
            context={{ dayNumber, date, destination }}
            onCancel={() => setSheet(null)}
            isSubmitting={createMut.isPending}
            onSubmit={async (input: CreateActivityInput) => {
              await createMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
        {sheet?.mode === "edit" && (
          <ActivityForm
            initial={sheet.activity}
            lockType
            onCancel={() => setSheet(null)}
            isSubmitting={updateMut.isPending}
            onSubmit={async (input: CreateActivityInput) => {
              await updateMut.mutateAsync({
                title: input.title,
                start_time: input.start_time,
                end_time: input.end_time,
                payload: input.payload,
              })
              setSheet(null)
            }}
          />
        )}
      </ResponsiveSheet>

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
