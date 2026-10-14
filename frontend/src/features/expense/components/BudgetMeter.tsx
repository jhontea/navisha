import { cn } from "@/lib/utils"
import { CATEGORY_ORDER, getCategoryColor } from "../categoryColors"

export interface BudgetMeterProps {
  /** Spent per category, in the trip's base currency. */
  byCategory: Record<string, number>
  /** Trip budget; without one the bar shows the category mix of what was spent. */
  budget?: number | null
  /** Accessible name, e.g. "Budget used". */
  label: string
  className?: string
}

/**
 * Spending as one rounded bar split by category (docs/DESIGN.md §5), in the
 * fixed category order with 2px gaps. Over budget, the bar is scaled to the
 * spend and a red end marks the overrun.
 */
export function BudgetMeter({ byCategory, budget, label, className }: BudgetMeterProps) {
  const spent = Object.values(byCategory).reduce((sum, v) => sum + Math.max(0, v), 0)
  const hasBudget = budget != null && budget > 0
  const scale = hasBudget ? Math.max(budget, spent) : spent
  const over = hasBudget && spent > budget
  const percent = hasBudget ? Math.round((spent / budget) * 100) : null

  const segments = CATEGORY_ORDER.map((key): { key: string; value: number } => ({ key, value: Math.max(0, byCategory[key] ?? 0) }))
    .concat(
      Object.entries(byCategory)
        .filter(([key]) => !(CATEGORY_ORDER as readonly string[]).includes(key))
        .map(([key, value]) => ({ key, value: Math.max(0, value) })),
    )
    .filter((s) => s.value > 0)

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={hasBudget ? budget : spent}
      aria-valuenow={spent}
      aria-valuetext={percent !== null ? `${percent}% of budget used${over ? ", over budget" : ""}` : undefined}
      className={cn("flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted", className)}
    >
      {scale > 0 &&
        segments.map((s) => (
          <span
            key={s.key}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", getCategoryColor(s.key).bar)}
            // Width is data, not style: no Tailwind class can express it.
            style={{ width: `${(s.value / scale) * 100}%` }}
          />
        ))}
      {over && <span className="h-full w-1.5 shrink-0 rounded-r-full bg-destructive" aria-hidden="true" />}
    </div>
  )
}
