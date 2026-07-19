"use client"

import { cn, formatCurrency } from "@/lib/utils"
import { useExpenseSummary } from "../hooks/useExpenses"
import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_COLORS } from "../categoryColors"

const CATEGORY_CONFIG = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([k, v]) => [k, { bar: v.bar, dot: v.bar, label: v.label }])
)

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
        <div className="lg:col-span-2 h-48 rounded-xl"><Skeleton variant="glass" className="h-full w-full" /></div>
        <div className="h-48 rounded-xl"><Skeleton variant="glass" className="h-full w-full" /></div>
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

  const total = data.total_base
  const usedPct = tripBudget && tripBudget > 0 ? (total / tripBudget) * 100 : null
  // stroke-dashoffset = CIRCUMFERENCE * (1 - pct/100)
  const dashOffset =
    usedPct !== null
      ? CIRCUMFERENCE * (1 - Math.min(usedPct, 100) / 100)
      : CIRCUMFERENCE * 0.59 // fallback visual

  // If no expenses but budget IS set, still show the budget ring so the user
  // can see their budget at a glance even before adding expenses.
  if (data.by_category.length === 0) {
    return (
      <div className="glass rounded-xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Budget ring — 0% used */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle className="text-muted" cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-chromatic-mint"
                cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={0}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl text-chromatic-mint">0%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Used</span>
            </div>
          </div>
          {/* Budget stats */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-muted-foreground mb-1">No expenses yet</p>
            {tripBudget && tripBudget > 0 ? (
              <>
                <p className="font-display text-2xl sm:text-3xl text-foreground mb-1">
                  {formatCurrency(tripBudget, data.base_currency)}
                </p>
                <p className="text-sm text-chromatic-mint font-medium">
                  {formatCurrency(tripBudget, data.base_currency)} available
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Set a budget to track your spending</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Add an expense below to see the breakdown.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Category Distribution Bar Card */}
      <div className="lg:col-span-2 glass rounded-xl p-4 sm:p-6">
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
      <div className="glass rounded-xl p-4 sm:p-6">
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
                  tripBudget - total < 0 ? "text-destructive" : "text-chromatic-mint"
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
                      tripBudget - total < 0 ? "text-destructive" : "text-chromatic-mint"
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
