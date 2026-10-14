"use client"

import { AlertTriangle, Pencil, Plus } from "lucide-react"

import { MoneyText } from "@/components/MoneyText"
import { StatusChip } from "@/components/StatusChip"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Day } from "@/features/trip/types"
import { getCategoryColor } from "../categoryColors"
import { BudgetMeter } from "./BudgetMeter"
import { useExpenses, useExpenseSummary } from "../hooks/useExpenses"
import {
  budgetStatus,
  buildCategoryRows,
  buildDailyTotals,
  categoryScale,
  type CategoryRow,
  type DailyTotals,
} from "../lib/budget"

interface Props {
  tripId: string
  budget?: number
  budgetCategories?: Record<string, number>
  days: Day[]
  onEditBudget: () => void
}

const CARD = "rounded-2xl border bg-card p-4 shadow-card sm:p-5"

/** Budget overview: spent vs budget, spending by category and by day. */
export function BudgetSummary({ tripId, budget, budgetCategories, days, onEditBudget }: Props) {
  const summary = useExpenseSummary(tripId)
  const expenses = useExpenses(tripId)

  if (summary.isLoading) {
    return (
      <div className="space-y-4" aria-label="Loading budget">
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (summary.isError || !summary.data) {
    return (
      <p role="alert" className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
        Couldn&apos;t load the budget. Check your connection and reload the page.
      </p>
    )
  }

  const { total_base: spent, base_currency: currency, by_category } = summary.data
  const status = budgetStatus(spent, budget)
  const rows = buildCategoryRows(by_category, budgetCategories)
  const daily = buildDailyTotals(expenses.data?.items ?? [], days)

  return (
    <div className="space-y-4">
      <SpentCard
        status={status}
        currency={currency}
        byCategory={Object.fromEntries(by_category.map((c) => [c.category, c.total]))}
        onEditBudget={onEditBudget}
      />
      {rows.length > 0 && <CategoryCard rows={rows} currency={currency} />}
      {days.length > 0 && daily.max + daily.outside > 0 && <DailyCard daily={daily} currency={currency} />}
    </div>
  )
}

function SpentCard({
  status,
  currency,
  byCategory,
  onEditBudget,
}: {
  status: ReturnType<typeof budgetStatus>
  currency: string
  byCategory: Record<string, number>
  onEditBudget: () => void
}) {
  const { spent, budget, remaining, ratio, over } = status
  const near = ratio !== null && !over && ratio >= 0.9

  return (
    <section className={CARD} aria-labelledby="budget-spent-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="budget-spent-heading" className="text-sm font-semibold text-muted-foreground">
            Spent
          </h3>
          <p className="mt-0.5 font-display text-3xl font-extrabold text-foreground">
            <MoneyText amount={spent} currency={currency} />
          </p>
          {budget !== null && (
            <p className="text-sm text-muted-foreground">
              of <MoneyText amount={budget} currency={currency} /> budget
            </p>
          )}
        </div>
        <Button variant="soft" size="sm" onClick={onEditBudget}>
          {budget !== null ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {budget !== null ? "Edit budget" : "Set budget"}
        </Button>
      </div>

      {ratio !== null && remaining !== null ? (
        <>
          <BudgetMeter byCategory={byCategory} budget={budget} label="Budget used" className="mt-4" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <StatusChip tone={over ? "danger" : near ? "warning" : "success"}>
              {over ? "Over budget" : `${Math.round(ratio * 100)}% used`}
            </StatusChip>
            {over ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                Over by <MoneyText amount={-remaining} currency={currency} />
              </span>
            ) : (
              <span className="font-medium text-foreground">
                <MoneyText amount={remaining} currency={currency} /> left
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Set a budget to see how much you have left.</p>
      )}
    </section>
  )
}

function CategoryCard({ rows, currency }: { rows: CategoryRow[]; currency: string }) {
  const scale = categoryScale(rows)
  const hasPlan = rows.some((r) => r.planned !== null)

  return (
    <section className={CARD} aria-labelledby="budget-category-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 id="budget-category-heading" className="font-display text-lg font-extrabold text-foreground">
          By category
        </h3>
        {hasPlan && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-0.5 rounded-full bg-foreground" aria-hidden="true" />
            Planned
          </span>
        )}
      </div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const cfg = getCategoryColor(row.category)
          const spentPct = scale > 0 ? (row.spent / scale) * 100 : 0
          const plannedPct = row.planned !== null && scale > 0 ? (row.planned / scale) * 100 : null
          return (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-foreground">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
                    <cfg.Icon className={cn("h-3.5 w-3.5", cfg.text)} aria-hidden="true" />
                  </span>
                  <span className="truncate">{cfg.label}</span>
                  {row.over && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Over
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="font-medium text-foreground">{formatMoney(row.spent, currency)}</span>
                  {row.planned !== null && (
                    <span className="text-muted-foreground"> / {formatMoney(row.planned, currency)}</span>
                  )}
                </span>
              </div>
              <div className="relative ml-9 mt-1.5 h-2 rounded-full bg-muted">
                {row.spent > 0 && (
                  <div
                    className={cn("h-full rounded-full", cfg.bar)}
                    style={{ width: `${Math.max(spentPct, 1)}%` }}
                  />
                )}
                {plannedPct !== null && (
                  <div
                    className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-card"
                    style={{ left: `${plannedPct}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DailyCard({ daily, currency }: { daily: DailyTotals; currency: string }) {
  const peak = daily.days.reduce<DailyTotals["days"][number] | null>(
    (best, d) => (d.total > 0 && (!best || d.total > best.total) ? d : best),
    null,
  )
  // Label every day on short trips; thin the labels out on long ones.
  const labelEvery = daily.days.length <= 10 ? 1 : Math.ceil(daily.days.length / 7)

  return (
    <section className={CARD} aria-labelledby="budget-daily-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="budget-daily-heading" className="font-display text-lg font-extrabold text-foreground">
          By day
        </h3>
        {peak && (
          <p className="text-xs text-muted-foreground">
            Highest: Day {peak.dayNumber} · <MoneyText amount={peak.total} currency={currency} />
          </p>
        )}
      </div>

      {daily.max > 0 && (
        <ol className="flex h-28 items-end gap-1" aria-label="Spending per day">
          {daily.days.map((d, i) => {
            const pct = (d.total / daily.max) * 100
            const label = `Day ${d.dayNumber}: ${formatMoney(d.total, currency)}`
            return (
              <li
                key={d.date}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-foreground shadow-overlay group-hover:block group-focus-visible:block"
                >
                  {label}
                </span>
                <span className="flex min-h-0 w-full flex-1 items-end justify-center" aria-hidden="true">
                  <span
                    className={cn(
                      "w-full max-w-9 rounded-t-lg",
                      d.total <= 0 ? "bg-muted" : d === peak ? "bg-primary" : "bg-primary/35",
                    )}
                    style={{ height: d.total > 0 ? `max(${pct}%, 3px)` : "3px" }}
                  />
                </span>
                <span className="h-4 text-xs leading-4 text-muted-foreground tabular-nums" aria-hidden="true">
                  {i % labelEvery === 0 ? d.dayNumber : ""}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {daily.outside > 0 && (
        <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
          Before or after the trip:{" "}
          <MoneyText amount={daily.outside} currency={currency} className="font-medium text-foreground" />
        </p>
      )}
    </section>
  )
}
