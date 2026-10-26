import { describe, expect, it } from "vitest"

import { addDaysISO, formatFriendlyRange, getInclusiveDayCount } from "./dates"

describe("formatFriendlyRange", () => {
  it("writes weekdays and the month once inside a month", () => {
    expect(formatFriendlyRange("2026-11-20", "2026-11-23")).toBe("Fri 20 – Mon 23 Nov")
    expect(formatFriendlyRange("2026-11-20", "2026-11-20")).toBe("Fri 20 Nov")
  })

  it("names both months across a month boundary", () => {
    expect(formatFriendlyRange("2026-10-30", "2026-11-01")).toBe("Fri 30 Oct – Sun 1 Nov")
  })

  it("adds years across a year boundary", () => {
    expect(formatFriendlyRange("2026-12-30", "2027-01-01")).toBe("Wed 30 Dec 2026 – Fri 1 Jan 2027")
  })

  it("returns empty for non ISO dates", () => {
    expect(formatFriendlyRange("", "2026-11-01")).toBe("")
  })
})

describe("getInclusiveDayCount", () => {
  it("counts both start and end day", () => {
    expect(getInclusiveDayCount("2026-10-01", "2026-10-01")).toBe(1)
    expect(getInclusiveDayCount("2026-10-01", "2026-10-05")).toBe(5)
  })

  it("crosses month and leap-year boundaries", () => {
    expect(getInclusiveDayCount("2026-01-30", "2026-02-02")).toBe(4)
    expect(getInclusiveDayCount("2028-02-28", "2028-03-01")).toBe(3)
  })

  it("returns null when end is before start", () => {
    expect(getInclusiveDayCount("2026-10-05", "2026-10-01")).toBeNull()
  })

  it("returns null for non ISO dates", () => {
    expect(getInclusiveDayCount("10/01/2026", "2026-10-05")).toBeNull()
    expect(getInclusiveDayCount("2026-10-01T00:00:00Z", "2026-10-05")).toBeNull()
  })
})

describe("addDaysISO", () => {
  it("moves across month and year ends", () => {
    expect(addDaysISO("2026-12-30", 2)).toBe("2027-01-01")
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29")
    expect(addDaysISO("2026-11-20", 0)).toBe("2026-11-20")
  })

  it("returns empty for a bad date", () => {
    expect(addDaysISO("", 3)).toBe("")
  })
})
