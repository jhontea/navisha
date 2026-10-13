import { describe, expect, it } from "vitest"

import { budgetStatus, buildCategoryRows, buildDailyTotals, categoryScale } from "./budget"

describe("budgetStatus", () => {
  it("has no ratio without a budget", () => {
    expect(budgetStatus(500, 0)).toEqual({ spent: 500, budget: null, remaining: null, ratio: null, over: false })
  })

  it("reports remaining and over", () => {
    expect(budgetStatus(250, 1000)).toMatchObject({ remaining: 750, ratio: 0.25, over: false })
    expect(budgetStatus(1200, 1000)).toMatchObject({ remaining: -200, ratio: 1.2, over: true })
  })
})

describe("buildCategoryRows", () => {
  it("keeps the fixed category order and includes planned-only categories", () => {
    const rows = buildCategoryRows(
      [
        { category: "food", total: 300 },
        { category: "accommodation", total: 900 },
        { category: "shopping", total: 0 },
      ],
      { transport: 400, food: 200 },
    )
    expect(rows.map((r) => r.category)).toEqual(["accommodation", "transport", "food"])
    expect(rows[1]).toEqual({ category: "transport", spent: 0, planned: 400, over: false })
    expect(rows[2]).toEqual({ category: "food", spent: 300, planned: 200, over: true })
    expect(rows[0].planned).toBeNull()
  })

  it("scales bars to the largest spent or planned value", () => {
    const rows = buildCategoryRows([{ category: "food", total: 300 }], { food: 500 })
    expect(categoryScale(rows)).toBe(500)
    expect(categoryScale([])).toBe(0)
  })
})

describe("buildDailyTotals", () => {
  const days = [
    { date: "2026-05-11", day_number: 2 },
    { date: "2026-05-10", day_number: 1 },
  ]

  it("sums converted amounts per trip day and collects the rest", () => {
    const result = buildDailyTotals(
      [
        { expense_date: "2026-05-10", converted_amount: 100 },
        { expense_date: "2026-05-10", converted_amount: 50 },
        { expense_date: "2026-05-11", converted_amount: 30 },
        { expense_date: "2026-04-01", converted_amount: 900 },
      ],
      days,
    )
    expect(result.days).toEqual([
      { date: "2026-05-10", dayNumber: 1, total: 150 },
      { date: "2026-05-11", dayNumber: 2, total: 30 },
    ])
    expect(result.outside).toBe(900)
    expect(result.max).toBe(150)
  })

  it("returns zeros for days without spending", () => {
    const result = buildDailyTotals([], days)
    expect(result.days.map((d) => d.total)).toEqual([0, 0])
    expect(result.max).toBe(0)
  })
})
