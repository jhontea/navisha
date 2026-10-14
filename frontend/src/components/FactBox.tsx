import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Small label + value tile (check-in date, nights, distance). DESIGN.md §5. */
export function FactBox({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg bg-muted px-3 py-2", className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
