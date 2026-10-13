import { describe, expect, it } from "vitest"

import { getTripDateMetrics, tripProgressLabel, tripProgressShort, tripStatus } from "./status"

const at = (iso: string) => new Date(`${iso}T12:00:00`)

describe("getTripDateMetrics", () => {
  it("is upcoming before the start date", () => {
    const m = getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-05-01"))
    expect(m.status).toBe("upcoming")
    expect(m.daysUntilStart).toBe(9)
  })

  it("is active on the first and last day", () => {
    expect(getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-05-10")).currentDay).toBe(1)
    const last = getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-05-19"))
    expect(last.status).toBe("active")
    expect(last.currentDay).toBe(10)
  })

  it("is past after the end date", () => {
    expect(tripStatus("2026-05-10", "2026-05-19")).toBe("past") // today is after May 2026 in CI too
    expect(getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-10-13")).status).toBe("past")
  })
})

// F3: a finished trip showed "Day 10 of 10 · in progress".
describe("trip progress labels", () => {
  it("says Completed for a finished trip", () => {
    const m = getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-10-13"))
    expect(tripProgressLabel(m)).toBe("Completed")
    expect(tripProgressShort(m)).toBe("Completed")
  })

  it("shows the current day while the trip is running", () => {
    const m = getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-05-12"))
    expect(tripProgressLabel(m)).toBe("Day 3 of 10 · in progress")
    expect(tripProgressShort(m)).toBe("Day 3 of 10")
  })

  it("says Upcoming before the trip", () => {
    const m = getTripDateMetrics("2026-05-10", "2026-05-19", at("2026-05-01"))
    expect(tripProgressLabel(m)).toBe("Upcoming")
    expect(tripProgressShort(m)).toBe("Not started yet")
  })
})
