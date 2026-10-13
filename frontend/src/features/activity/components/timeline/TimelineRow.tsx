import { forwardRef, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * One timeline row: time column, icon on a vertical rail, and the card.
 * The rail is drawn per row so rows can be reordered freely.
 */
export const TimelineRow = forwardRef<
  HTMLDivElement,
  {
    time?: string | null
    icon: ReactNode
    children: ReactNode
    className?: string
    style?: CSSProperties
  }
>(function TimelineRow({ time, icon, children, className, style }, ref) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn("relative grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)] gap-x-1.5 sm:grid-cols-[3.25rem_2.75rem_minmax(0,1fr)] sm:gap-x-2", className)}
    >
      <div className="pt-3 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {time}
      </div>
      <div className="relative flex justify-center before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border">
        <div className="relative z-10 pt-0.5">{icon}</div>
      </div>
      <div className="min-w-0 pb-3">{children}</div>
    </div>
  )
})
