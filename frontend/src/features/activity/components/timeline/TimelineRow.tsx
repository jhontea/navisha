import { forwardRef, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * One timeline row: time column, icon on a vertical rail, and the card.
 * The rail is drawn per row so rows can be reordered freely.
 */
export const TimelineRow = forwardRef<
  HTMLDivElement,
  {
    id?: string
    time?: string | null
    icon: ReactNode
    children: ReactNode
    className?: string
    style?: CSSProperties
  }
>(function TimelineRow({ id, time, icon, children, className, style }, ref) {
  return (
    <div
      ref={ref}
      id={id}
      style={style}
      className={cn("relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-1.5 sm:grid-cols-[3.5rem_2.75rem_minmax(0,1fr)] sm:gap-x-2", className)}
    >
      {/* Phones skip the time column: each card already shows its time. */}
      <div className="hidden items-start justify-end pt-2.5 sm:flex">
        {time && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">{time}</span>
        )}
      </div>
      <div className="relative flex justify-center before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-border">
        <div className="relative z-10 pt-0.5">{icon}</div>
      </div>
      <div className="min-w-0 pb-3">{children}</div>
    </div>
  )
})
