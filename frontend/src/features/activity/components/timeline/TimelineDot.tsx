import type { HTMLAttributes, Ref } from "react"
import { Hotel } from "lucide-react"

import { cn } from "@/lib/utils"
import { transportIcon } from "./transportIcon"

/**
 * Round marker on the timeline's left rail. For activities it doubles as the
 * drag handle when `dragHandleProps` is passed.
 */
export function TimelineDot({
  kind,
  activityType,
  transportType,
  dragHandleProps,
  dragHandleRef,
}: {
  kind: "activity" | "transport" | "accommodation"
  activityType?: string
  transportType?: string
  dragHandleProps?: HTMLAttributes<HTMLDivElement>
  dragHandleRef?: Ref<HTMLDivElement>
}) {
  if (kind === "transport") {
    const Icon = transportIcon(transportType)
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
      <div ref={dragHandleRef} aria-label="Drag to reorder" role={dragHandleProps ? "button" : undefined} tabIndex={dragHandleProps ? 0 : undefined} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg, dragHandleProps && "touch-none cursor-grab active:cursor-grabbing")} {...dragHandleProps}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><polyline points="15 3 15 9 21 9"/></svg>
      </div>
    )
  }
  if (activityType === "todo") {
    return (
      <div ref={dragHandleRef} aria-label="Drag to reorder" role={dragHandleProps ? "button" : undefined} tabIndex={dragHandleProps ? 0 : undefined} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg, dragHandleProps && "touch-none cursor-grab active:cursor-grabbing")} {...dragHandleProps}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
      </div>
    )
  }
  return (
    <div ref={dragHandleRef} aria-label="Drag to reorder" role={dragHandleProps ? "button" : undefined} tabIndex={dragHandleProps ? 0 : undefined} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background", bg, dragHandleProps && "touch-none cursor-grab active:cursor-grabbing")} {...dragHandleProps}>
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  )
}
