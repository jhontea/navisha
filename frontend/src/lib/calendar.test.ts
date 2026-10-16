import { describe, expect, it } from "vitest"

import {
  dateSortKey,
  daysBetween,
  defaultTripDate,
  localDateString,
  formatClock,
  formatShortRange,
  formatWeekdayDate,
  nightsBetween,
  tripDayNumber,
} from "./calendar"

describe("calendar helpers", () => {
  it("reads clock time as written", () => {
    expect(formatClock("2026-05-10T06:30:00")).toBe("06:30")
    expect(formatClock("2026-05-10T23:05:00+07:00")).toBe("23:05")
    expect(formatClock("2026-05-10")).toBeNull()
    expect(formatClock(null)).toBeNull()
  })

  it("formats weekday dates without timezone shifts", () => {
    expect(formatWeekdayDate("2026-05-10")).toBe("Sun, 10 May")
    expect(formatWeekdayDate("2026-05-10T00:30:00")).toBe("Sun, 10 May")
    expect(formatWeekdayDate("")).toBeNull()
  })

  it("formats short ranges", () => {
    expect(formatShortRange("2026-05-10", "2026-05-14")).toBe("10–14 May")
    expect(formatShortRange("2026-04-28", "2026-05-03")).toBe("28 Apr – 3 May")
    expect(formatShortRange("2026-05-10", "2026-05-10")).toBe("10 May")
    expect(formatShortRange("2026-05-10", "")).toBe("10 May")
    expect(formatShortRange(null, null)).toBeNull()
  })

  it("counts calendar days and nights", () => {
    expect(daysBetween("2026-05-10T22:00:00", "2026-05-11T06:00:00")).toBe(1)
    expect(daysBetween("2026-05-10T06:30:00", "2026-05-10T17:00:00")).toBe(0)
    expect(daysBetween("2026-05-10", null)).toBeNull()
    expect(nightsBetween("2026-05-10", "2026-05-14")).toBe(4)
    expect(nightsBetween("2026-05-10", "2026-05-10")).toBe(1)
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3)
  })

  it("maps a date to its trip day", () => {
    const days = [
      { date: "2026-05-10", day_number: 1 },
      { date: "2026-05-11", day_number: 2 },
    ]
    expect(tripDayNumber("2026-05-11T09:00:00", days)).toBe(2)
    expect(tripDayNumber("2026-05-12", days)).toBeNull()
    expect(tripDayNumber(null, days)).toBeNull()
  })

  it("sorts undated items last", () => {
    expect(["2026-05-11", "", "2026-05-10"].map(dateSortKey).sort()).toEqual(["2026-05-10", "2026-05-11", "9999"])
  })
})

describe("defaultTripDate", () => {
  it("uses the trip's first day before and after the trip", () => {
    expect(defaultTripDate("2026-11-07", "2026-11-08", "2026-10-16")).toBe("2026-11-07")
    expect(defaultTripDate("2026-11-07", "2026-11-08", "2026-12-01")).toBe("2026-11-07")
  })

  it("uses today during the trip, and when the trip has no dates", () => {
    expect(defaultTripDate("2026-11-07", "2026-11-08", "2026-11-08")).toBe("2026-11-08")
    expect(defaultTripDate(undefined, undefined, "2026-10-16")).toBe("2026-10-16")
  })

  it("formats today in local time", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05")
  })
})
