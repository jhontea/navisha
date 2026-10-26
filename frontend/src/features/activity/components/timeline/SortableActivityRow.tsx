import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Activity } from "../../types"
import { ActivityCard } from "../ActivityCard"
import { TimelineIcon } from "./TimelineIcon"
import { TimelineRow } from "./TimelineRow"

interface SortableActivityRowProps {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
  onToggleTodo?: (itemId: string) => void
  overlapTitles: string[]
  selectMode: boolean
  isSelected: boolean
  onToggleSelect: () => void
  /** Highlighted because it is focused on the map. */
  isFocused: boolean
  onFocus: () => void
}

export const dragHandleId = (activityId: string) => `drag-${activityId}`

/**
 * An activity on the timeline. The rail icon is the drag handle; in select
 * mode it is replaced by a checkbox and reordering is off.
 */
export function SortableActivityRow({
  activity,
  onEdit,
  onDelete,
  onToggleTodo,
  overlapTitles,
  selectMode,
  isSelected,
  onToggleSelect,
  isFocused,
  onFocus,
}: SortableActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
    useSortable({ id: activity.id, disabled: selectMode })

  const icon = selectMode ? (
    // eslint-disable-next-line no-restricted-syntax -- custom role=checkbox on the timeline rail
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={isSelected ? `Deselect ${activity.title}` : `Select ${activity.title}`}
      onClick={onToggleSelect}
      className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md border-2 ring-4 ring-background",
          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        )}
      >
        {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
      </span>
    </button>
  ) : (
    <TimelineIcon
      kind={activity.type}
      dragHandleProps={{ ...attributes, ...listeners }}
      dragHandleRef={setActivatorNodeRef}
      dragHandleId={dragHandleId(activity.id)}
      dragLabel={`Reorder ${activity.title}`}
    />
  )

  return (
    <TimelineRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      time={activity.start_time?.slice(0, 5)}
      icon={icon}
      className={cn(isDragging && "z-50 opacity-60")}
    >
      <div id={`activity-${activity.id}`}>
        <ActivityCard
          activity={activity}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleTodo={selectMode ? undefined : onToggleTodo}
          overlapTitles={overlapTitles}
          selected={isFocused || (selectMode && isSelected)}
          onSelect={selectMode ? onToggleSelect : onFocus}
        />
      </div>
    </TimelineRow>
  )
}
