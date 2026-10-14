import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number // 0-100
  max?: number
  size?: "sm" | "default"
  /** Accessible name of the bar (not shown). */
  label: string
  tone?: "default" | "danger"
  className?: string
}

/** A thin solid progress bar. */
export function Progress({ value, max = 100, size = "default", label, tone = "default", className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("w-full overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      <div className={cn("h-full rounded-full transition-all duration-500 ease-out", tone === "danger" ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  )
}
