import { describe, expect, it } from "vitest"

import { overviewTodos, type OverviewTodoInput } from "./overviewTodos"

const ready: OverviewTodoInput = {
  tripId: "t1",
  activityCount: 5,
  stayCount: 1,
  transportCount: 1,
  budget: 1000,
  spent: 400,
  emptyDayCount: 0,
  overCategoryCount: 0,
}

describe("overviewTodos", () => {
  it("is empty for a ready trip", () => {
    expect(overviewTodos(ready)).toEqual([])
  })

  it("lists every missing piece for a new trip, itinerary first", () => {
    const labels = overviewTodos({
      ...ready,
      activityCount: 0,
      stayCount: 0,
      transportCount: 0,
      budget: 0,
      spent: 0,
      emptyDayCount: 3,
    }).map((t) => t.label)
    expect(labels).toEqual([
      "Add activities to your itinerary",
      "Add where you're staying",
      "Add your transport",
      "Set a trip budget",
    ])
  })

  it("counts empty days only once activities exist and counts are known", () => {
    expect(overviewTodos({ ...ready, emptyDayCount: 1 })[0]).toEqual({ label: "1 day has no activities", href: "/trips/t1" })
    expect(overviewTodos({ ...ready, emptyDayCount: 2 })[0].label).toBe("2 days have no activities")
    expect(overviewTodos({ ...ready, emptyDayCount: null })).toEqual([])
  })

  it("flags overspending and over-plan categories", () => {
    const todos = overviewTodos({ ...ready, spent: 1200, overCategoryCount: 2 })
    expect(todos.map((t) => t.label)).toEqual(["Spending is over budget", "2 budget categories are over plan"])
    expect(todos.every((t) => t.href === "/trips/t1/budget")).toBe(true)
  })
})
