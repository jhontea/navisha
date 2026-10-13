import { describe, expect, it } from "vitest"

import { getTripDateMetrics } from "./status"
import { formatTripRange, groupTrips, pickNextUp, tripStats, tripTimingLabel } from "./home"

const today = new Date(2026, 9, 13) // 13 Oct 2026, local time

const trip = (id: string, start_date: string, end_date: string, base_currency = "IDR") => ({
  id,
  start_date,
  end_date,
  base_currency,
})

const past1 = trip("past-old", "2026-01-05", "2026-01-10")
const past2 = trip("past-new", "2026-05-10", "2026-05-19", "JPY")
const active = trip("active", "2026-10-10", "2026-10-16")
const soon = trip("soon", "2026-10-20", "2026-10-22")
const later = trip("later", "2027-01-01", "2027-01-03")

describe("groupTrips", () => {
  it("puts active and upcoming first (soonest first) and past newest first", () => {
    const { upcoming, past } = groupTrips([past1, later, past2, soon, active], today)
    expect(upcoming.map((t) => t.id)).toEqual(["active", "soon", "later"])
    expect(past.map((t) => t.id)).toEqual(["past-new", "past-old"])
  })
})

describe("pickNextUp", () => {
  it("prefers a trip in progress", () => {
    expect(pickNextUp([later, soon, active], today)?.id).toBe("active")
  })

  it("falls back to the soonest upcoming trip, or null", () => {
    expect(pickNextUp([later, soon, past1], today)?.id).toBe("soon")
    expect(pickNextUp([past1, past2], today)).toBeNull()
  })
})

describe("tripTimingLabel", () => {
  it("describes active, upcoming and past trips", () => {
    expect(tripTimingLabel(getTripDateMetrics(active.start_date, active.end_date, today))).toBe("Day 4 of 7")
    expect(tripTimingLabel(getTripDateMetrics(soon.start_date, soon.end_date, today))).toBe("In 7 days")
    expect(tripTimingLabel(getTripDateMetrics("2026-10-14", "2026-10-15", today))).toBe("Starts tomorrow")
    expect(tripTimingLabel(getTripDateMetrics(past1.start_date, past1.end_date, today))).toBe("Completed")
  })
})

describe("formatTripRange", () => {
  it("collapses shared month and year", () => {
    expect(formatTripRange("2026-05-10", "2026-05-19")).toBe("10–19 May 2026")
    expect(formatTripRange("2026-04-28", "2026-05-03")).toBe("28 Apr – 3 May 2026")
    expect(formatTripRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027")
    expect(formatTripRange("2026-05-10", "2026-05-10")).toBe("10 May 2026")
    expect(formatTripRange("", "2026-05-10")).toBe("")
  })
})

describe("tripStats", () => {
  it("counts trips, planned days and distinct currencies", () => {
    expect(tripStats([past1, past2, soon])).toEqual({ trips: 3, days: 6 + 10 + 3, currencies: 2 })
    expect(tripStats([])).toEqual({ trips: 0, days: 0, currencies: 0 })
  })
})
