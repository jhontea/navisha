import type { HTMLAttributes, Ref } from "react"
import { Hotel, ListChecks, MapPin, StickyNote } from "lucide-react"

import { cn } from "@/lib/utils"
import { transportIcon } from "@/features/transportation/lib/transportType"

type Kind = "location" | "note" | "todo" | "transport" | "stay"

// Category tint for each timeline item kind (docs/DESIGN_SYSTEM.md tokens).
const STYLE: Record<Kind, string> = {
  location: "bg-primary/10 text-primary",
  transport: "bg-cat-transport/15 text-cat-transport",
  stay: "bg-cat-stay/15 text-cat-stay",
  note: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
}

/**
 * Round icon on the timeline rail. With `dragHandleProps` it becomes the
 * drag handle for reordering, with a 44px hit area.
 */
export function TimelineIcon({
  kind,
  transportType,
  dragHandleProps,
  dragHandleRef,
}: {
  kind: Kind
  transportType?: string
  dragHandleProps?: HTMLAttributes<HTMLDivElement>
  dragHandleRef?: Ref<HTMLDivElement>
}) {
  const Icon =
    kind === "transport"
      ? transportIcon(transportType)
      : kind === "stay"
        ? Hotel
        : kind === "note"
          ? StickyNote
          : kind === "todo"
            ? ListChecks
            : MapPin

  const circle = (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-background", STYLE[kind])}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  )

  if (!dragHandleProps) return <div className="flex h-11 w-11 items-center justify-center">{circle}</div>

  return (
    <div
      ref={dragHandleRef}
      role="button"
      tabIndex={0}
      aria-label="Drag to reorder"
      className="flex h-11 w-11 touch-none cursor-grab items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      {...dragHandleProps}
    >
      {circle}
    </div>
  )
}
