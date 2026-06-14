"use client"

import { formatCurrency } from "@/lib/utils"
import { useExpenseSummary } from "../hooks/useExpenses"

const CATEGORY_COLOR: Record<string, string> = {
  accommodation: "bg-blue-500",
  transport: "bg-emerald-500",
  food: "bg-amber-500",
  activity: "bg-purple-500",
  other: "bg-slate-500",
}

interface Props {
  tripId: string
}

export function BudgetSummary({ tripId }: Props) {
  const { data, isLoading, isError } = useExpenseSummary(tripId)

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading summary…</p>
  }
  if (isError || !data) {
    return (
      <p className="text-xs text-destructive">Failed to load summary.</p>
    )
  }

  if (data.by_category.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No expenses yet. Add one to see the breakdown.
      </div>
    )
  }

  const total = data.total_base
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs text-muted-foreground">Total spent</p>
        <p className="text-xl font-bold tabular-nums">
          {formatCurrency(total, data.base_currency)}
        </p>
      </div>
      {/* Stacked bar visualizes category share of total. */}
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {data.by_category.map((c) => {
          const pct = total > 0 ? (c.total / total) * 100 : 0
          return (
            <div
              key={c.category}
              className={CATEGORY_COLOR[c.category] ?? "bg-slate-400"}
              style={{ width: `${pct}%` }}
              title={`${c.category}: ${pct.toFixed(1)}%`}
            />
          )
        })}
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {data.by_category.map((c) => (
          <li
            key={c.category}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${CATEGORY_COLOR[c.category] ?? "bg-slate-400"}`}
              />
              <span className="capitalize">{c.category}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(c.total, data.base_currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
