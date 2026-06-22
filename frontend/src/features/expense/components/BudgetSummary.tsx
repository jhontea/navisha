"use client"

import { cn, formatCurrency } from "@/lib/utils"
import { useExpenseSummary } from "../hooks/useExpenses"

const CATEGORY_CONFIG: Record<
  string,
  { bar: string; dot: string; label: string }
> = {
  accommodation: {
    bar: "bg-primary",
    dot: "bg-primary",
    label: "Stay",
  },
  transport: {
    bar: "bg-[#DBEAFE]",
    dot: "bg-[#DBEAFE]",
    label: "Transport",
  },
  food: {
    bar: "bg-[#DCFCE7]",
    dot: "bg-[#DCFCE7]",
    label: "Food",
  },
  activity: {
    bar: "bg-[#FFEDD5]",
    dot: "bg-[#FFEDD5]",
    label: "Activity",
  },
  souvenir: {
    bar: "bg-[#FCE7F3]",
    dot: "bg-[#FCE7F3]",
    label: "Gift",
  },
  shopping: {
    bar: "bg-[#FEF9C3]",
    dot: "bg-[#FEF9C3]",
    label: "Shopping",
  },
  other: {
    bar: "bg-muted",
    dot: "bg-muted",
    label: "Other",
  },
}

const CIRCUMFERENCE = 2 * Math.PI * 58 // r=58

interface Props {
  tripId: string
  tripBudget?: number
}

export function BudgetSummary({ tripId, tripBudget }: Props) {
  const { data, isLoading, isError } = useExpenseSummary(tripId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
        Failed to load budget summary.
      </p>
    )
  }

  if (data.by_category.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground mb-8">
        No expenses yet. Add one below to see the breakdown.
      </div>
    )
  }

  const total = data.total_base
  const usedPct = tripBudget && tripBudget > 0 ? (total / tripBudget) * 100 : null
  // stroke-dashoffset = CIRCUMFERENCE * (1 - pct/100)
  const dashOffset =
    usedPct !== null
      ? CIRCUMFERENCE * (1 - Math.min(usedPct, 100) / 100)
      : CIRCUMFERENCE * 0.59 // fallback visual

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Category Distribution Bar Card */}
      <div className="lg:col-span-2 bg-card border border-border/40 shadow-sm rounded-xl p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-label-md text-foreground">Category Distribution</h4>
          <span className="text-label-sm bg-muted px-2 py-1 rounded text-muted-foreground">
            {data.by_category.length} categor{data.by_category.length === 1 ? "y" : "ies"}
          </span>
        </div>

        {/* Stacked Bar */}
        <div className="h-8 w-full flex rounded-full overflow-hidden mb-4 bg-muted">
          {data.by_category.map((c) => {
            const pct = total > 0 ? (c.total / total) * 100 : 0
            const cfg = CATEGORY_CONFIG[c.category] ?? CATEGORY_CONFIG.other
            return (
              <div
                key={c.category}
                className={cn("h-full", cfg.bar)}
                style={{ width: `${pct}%` }}
                title={`${cfg.label}: ${pct.toFixed(1)}%`}
              />
            )
          })}
        </div>

        {/* Legend — flex-wrap so items don't get crammed on small screens */}
        <div className="flex flex-wrap gap-x-4 gap-y-2.5">
          {data.by_category.map((c) => {
            const cfg = CATEGORY_CONFIG[c.category] ?? CATEGORY_CONFIG.other
            const pct = total > 0 ? (c.total / total) * 100 : 0
            return (
              <div key={c.category} className="flex items-center gap-2 min-w-0">
                <span
                  className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border/40", cfg.dot)}
                />
                <span className="text-label-sm text-muted-foreground truncate">
                  {cfg.label}{" "}
                  <span className="text-muted-foreground/70">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Budget Health — on mobile show as horizontal row, on lg show as ring card */}
      <div className="bg-card border border-border/40 shadow-sm rounded-xl p-4 sm:p-6">
        {/* Mobile: horizontal layout */}
        <div className="flex items-center gap-4 lg:hidden">
          {/* Mini ring */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle className="text-muted" cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="10" />
              <circle
                className={cn(usedPct !== null && usedPct > 100 ? "text-destructive" : "text-primary")}
                cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="10"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-[11px] font-bold leading-tight",
                usedPct !== null && usedPct > 100 ? "text-destructive" : "text-foreground"
              )}>
                {usedPct !== null ? `${Math.round(usedPct)}%` : "—"}
              </span>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-label-md text-foreground">{formatCurrency(total, data.base_currency)}</span>
              <span className="text-label-sm text-muted-foreground">spent</span>
            </div>
            {tripBudget ? (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                <span className="text-xs text-muted-foreground">
                  Budget: <span className="text-foreground font-medium">{formatCurrency(tripBudget, data.base_currency)}</span>
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  tripBudget - total < 0 ? "text-destructive" : "text-emerald-600"
                )}>
                  {tripBudget - total < 0 ? "Over " : "Left: "}
                  {formatCurrency(Math.abs(tripBudget - total), data.base_currency)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.by_category.length} categor{data.by_category.length === 1 ? "y" : "ies"} tracked
              </p>
            )}
          </div>
        </div>

        {/* Desktop: centered ring + stats */}
        <div className="hidden lg:flex flex-col items-center text-center">
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle className="text-muted" cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" />
              <circle
                className={cn(usedPct !== null && usedPct > 100 ? "text-destructive" : "text-primary")}
                cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "font-display text-headline-sm",
                usedPct !== null && usedPct > 100 ? "text-destructive" : "text-foreground"
              )}>
                {usedPct !== null ? `${Math.round(usedPct)}%` : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {usedPct !== null ? "Used" : "Spent"}
              </span>
            </div>
          </div>

          <p
            className="font-label-md text-foreground mb-0.5 cursor-default"
            title={`${data.base_currency} ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          >
            {formatCurrency(total, data.base_currency)}
          </p>
          <p className="text-label-sm text-muted-foreground mb-1">Total spent</p>

          {tripBudget ? (
            <>
              <div className="w-full border-t border-border/30 my-3" />
              <div className="w-full space-y-1.5 text-left">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-label-sm text-muted-foreground flex-shrink-0">Budget</span>
                  <span
                    className="font-label-md text-foreground text-right truncate cursor-default"
                    title={`${data.base_currency} ${tripBudget.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  >
                    {formatCurrency(tripBudget, data.base_currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-label-sm text-muted-foreground flex-shrink-0">Remaining</span>
                  <span
                    className={cn(
                      "font-label-md text-right truncate cursor-default",
                      tripBudget - total < 0 ? "text-destructive" : "text-emerald-600"
                    )}
                    title={`${data.base_currency} ${Math.abs(tripBudget - total).toLocaleString(undefined, { maximumFractionDigits: 2 })}${tripBudget - total < 0 ? " over budget" : " remaining"}`}
                  >
                    {tripBudget - total < 0 ? "-" : ""}{formatCurrency(Math.abs(tripBudget - total), data.base_currency)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-label-sm text-muted-foreground">
              {data.by_category.length} categor{data.by_category.length === 1 ? "y" : "ies"} tracked
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
