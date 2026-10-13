import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CheckSquare } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Activity, CreateActivityInput } from "../../types"
import { ActivityCard } from "../ActivityCard"
import { ActivityForm } from "../ActivityForm"
import { TimelineDot } from "./TimelineDot"

interface SortableActivityRowProps {
  activity: Activity
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (input: CreateActivityInput) => Promise<void>
  isSubmitting: boolean
  onDelete: () => void
  isDeleting: boolean
  overlapTitles: string[]
  selectMode: boolean
  isSelected: boolean
  onToggleSelect: () => void
}

/** An activity on the timeline: drag-to-reorder, select checkbox, or inline edit form. */
export function SortableActivityRow({
  activity,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  isSubmitting,
  onDelete,
  isDeleting,
  overlapTitles,
  selectMode,
  isSelected,
  onToggleSelect,
}: SortableActivityRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: activity.id, disabled: selectMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex gap-2 pl-10 sm:gap-3 sm:pl-12",
        isDragging && "opacity-50 z-50",
        selectMode && isSelected && "ring-2 ring-primary/40 rounded-2xl",
      )}
    >
      {/* Timeline dot (also the drag handle outside select mode) */}
      <div className="absolute left-0 top-5 -translate-y-1/2">
        <TimelineDot
          kind="activity"
          activityType={activity.type}
          dragHandleProps={!selectMode ? { ...attributes, ...listeners } : undefined}
          dragHandleRef={!selectMode ? setActivatorNodeRef : undefined}
        />
      </div>

      <div className="flex flex-1 items-start gap-2 min-w-0">
        {/* Select checkbox — shown only in select mode */}
        {selectMode && (
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={isSelected ? `Deselect ${activity.title}` : `Select ${activity.title}`}
            onClick={onToggleSelect}
            className={cn(
              "mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50",
            )}
          >
            {isSelected && <CheckSquare className="h-4 w-4" />}
          </button>
        )}

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
              overlapTitles={overlapTitles}
            />
          )}
        </div>
      </div>
    </div>
  )
}
