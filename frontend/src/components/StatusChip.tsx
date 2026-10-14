import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const TONE: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-destructive-bg text-destructive",
  info: "bg-primary-soft text-primary-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
}

/**
 * Status as a soft pill with text ("4/6 ready", "Over budget"). Never colour
 * alone (DESIGN.md §2.2).
 */
export function StatusChip({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: StatusTone
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-extrabold tabular-nums",
        TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}
