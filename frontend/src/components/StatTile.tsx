import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A single headline number with a label, on a neutral card. Color carries no
 * meaning here; use `tone` only for a status the number represents.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  className,
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  /** Secondary line under the label, e.g. "of Rp 65,000,000". */
  hint?: ReactNode
  tone?: "neutral" | "danger" | "success"
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border bg-card shadow-card p-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
