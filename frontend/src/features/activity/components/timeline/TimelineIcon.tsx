import { createElement, type HTMLAttributes, type Ref } from "react"
import { Hotel, ListChecks, MapPin, StickyNote, type LucideProps } from "lucide-react"

import { cn } from "@/lib/utils"
import { TransportIcon } from "@/features/transportation/components/TransportIcon"

type Kind = "location" | "note" | "todo" | "transport" | "stay"

// One soft blue for places and bookings, neutral for notes and to-dos (DESIGN.md §2.1).
const STYLE: Record<Kind, string> = {
  location: "bg-primary-soft text-primary-soft-foreground",
  transport: "bg-primary-soft text-primary-soft-foreground",
  stay: "bg-primary-soft text-primary-soft-foreground",
  note: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
}

const KIND_ICON: Record<Exclude<Kind, "transport">, typeof MapPin> = {
  location: MapPin,
  stay: Hotel,
  note: StickyNote,
  todo: ListChecks,
}

/** Icon for a timeline item; picked at module level, not during render. */
function KindIcon({ kind, transportType, ...props }: { kind: Kind; transportType?: string } & LucideProps) {
  if (kind === "transport") return <TransportIcon type={transportType} {...props} />
  return createElement(KIND_ICON[kind], props)
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
  dragHandleId,
  dragLabel = "Drag to reorder",
}: {
  kind: Kind
  transportType?: string
  dragHandleProps?: HTMLAttributes<HTMLDivElement>
  dragHandleRef?: Ref<HTMLDivElement>
  /** Lets the timeline give focus back to the handle after a drop. */
  dragHandleId?: string
  dragLabel?: string
}) {
  const circle = (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-background", STYLE[kind])}>
      <KindIcon kind={kind} transportType={transportType} className="h-4 w-4" aria-hidden="true" />
    </span>
  )

  if (!dragHandleProps) return <div className="flex h-11 w-11 items-center justify-center">{circle}</div>

  return (
    <div
      ref={dragHandleRef}
      id={dragHandleId}
      role="button"
      tabIndex={0}
      aria-label={dragLabel}
      className="flex h-11 w-11 touch-none cursor-grab items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      {...dragHandleProps}
    >
      {circle}
    </div>
  )
}
