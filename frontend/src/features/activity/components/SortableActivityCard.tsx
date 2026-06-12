"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActivityCard } from "./ActivityCard"
import type { Activity } from "../types"

interface Props {
  activity: Activity
  index: number // 0-based position; rendered as index+1
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function SortableActivityCard({
  activity,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
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
      className={cn(
        "flex items-center gap-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="flex w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        style={{
          width: "1.75rem",
          height: "1.75rem",
          borderRadius: "9999px",
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--foreground))",
        }}
        className="flex shrink-0 items-center justify-center text-xs font-semibold tabular-nums"
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <ActivityCard
          activity={activity}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
