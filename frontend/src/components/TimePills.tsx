"use client"

import { cn } from "@/lib/utils"

export interface TimePill {
  id: string
  /** "06:00 – 07:00" or "17:30" */
  label: string
  /** Read by screen readers after the time, e.g. the activity title. */
  description?: string
}

/**
 * Times of the selected day as pills (docs/DESIGN.md §5 TimePills). Picking
 * one jumps to that activity; the current one is tinted.
 */
export function TimePills({
  items,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Times",
}: {
  items: TimePill[]
  value: string | null
  onChange: (id: string) => void
  className?: string
  "aria-label"?: string
}) {
  return (
    <div aria-label={ariaLabel} role="group" className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]", className)}>
      {items.map((item) => {
        const pressed = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={pressed}
            aria-label={item.description ? `${item.label}, ${item.description}` : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pressed
                ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
