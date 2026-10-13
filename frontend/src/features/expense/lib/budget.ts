import { categoryRank } from "../categoryColors"
import type { CategoryTotal, Expense } from "../types"

export interface BudgetStatus {
  spent: number
  budget: number | null
  /** budget - spent; negative when over. Null without a budget. */
  remaining: number | null
  /** spent / budget, uncapped (1.2 = 20% over). Null without a budget. */
  ratio: number | null
  over: boolean
}

export function budgetStatus(spent: number, budget?: number | null): BudgetStatus {
  if (!budget || budget <= 0) {
    return { spent, budget: null, remaining: null, ratio: null, over: false }
  }
  const remaining = budget - spent
  return { spent, budget, remaining, ratio: spent / budget, over: remaining < 0 }
}

export interface CategoryRow {
  category: string
  spent: number
  /** Planned amount for this category, or null when none was set. */
  planned: number | null
  over: boolean
}

/**
 * One row per category that has spending or a plan, in the fixed category
 * order (the palette is validated for that order).
 */
export function buildCategoryRows(
  byCategory: CategoryTotal[],
  planned: Record<string, number> = {},
): CategoryRow[] {
  const spentBy = new Map(byCategory.map((c) => [c.category as string, c.total]))
  const categories = new Set<string>([
    ...byCategory.filter((c) => c.total > 0).map((c) => c.category as string),
    ...Object.entries(planned).filter(([, v]) => v > 0).map(([k]) => k),
  ])
  return Array.from(categories)
    .sort((a, b) => categoryRank(a) - categoryRank(b))
    .map((category) => {
      const spent = spentBy.get(category) ?? 0
      const plan = planned[category] > 0 ? planned[category] : null
      return { category, spent, planned: plan, over: plan !== null && spent > plan }
    })
}

/** Shared scale for the category bars: the largest spent or planned value. */
export function categoryScale(rows: CategoryRow[]): number {
  return rows.reduce((max, r) => Math.max(max, r.spent, r.planned ?? 0), 0)
}

export interface DailyTotal {
  date: string
  dayNumber: number
  total: number
}

export interface DailyTotals {
  days: DailyTotal[]
  /** Spending dated before the first or after the last trip day. */
  outside: number
  max: number
}

/** Spending per trip day in the base currency (converted_amount). */
export function buildDailyTotals(
  expenses: Pick<Expense, "expense_date" | "converted_amount">[],
  days: { date: string; day_number: number }[],
): DailyTotals {
  const byDate = new Map<string, number>()
  for (const e of expenses) {
    byDate.set(e.expense_date, (byDate.get(e.expense_date) ?? 0) + e.converted_amount)
  }
  const tripDates = new Set(days.map((d) => d.date))
  const result = [...days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({ date: d.date, dayNumber: d.day_number, total: byDate.get(d.date) ?? 0 }))
  let outside = 0
  byDate.forEach((total, date) => {
    if (!tripDates.has(date)) outside += total
  })
  const max = result.reduce((m, d) => Math.max(m, d.total), 0)
  return { days: result, outside, max }
}
