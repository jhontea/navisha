import { describe, expect, it } from "vitest"

import {
  addMinutesToTime,
  findActivityOverlaps,
  formatActivityTimeRange,
  formatDuration,
  getDurationMinutes,
} from "./time"

describe("addMinutesToTime", () => {
  it("adds minutes and pads the result", () => {
    expect(addMinutesToTime("08:30", 45)).toBe("09:15")
    expect(addMinutesToTime("00:00", 5)).toBe("00:05")
  })

  it("returns null when the result passes midnight", () => {
    expect(addMinutesToTime("23:30", 30)).toBeNull()
  })

  it("returns null for invalid times", () => {
    expect(addMinutesToTime("24:00", 10)).toBeNull()
    expect(addMinutesToTime("8:30", 10)).toBeNull()
  })
})

describe("getDurationMinutes", () => {
  it("returns the difference in minutes", () => {
    expect(getDurationMinutes("09:00", "10:30")).toBe(90)
  })

  it("returns null when end is not after start", () => {
    expect(getDurationMinutes("10:00", "10:00")).toBeNull()
    expect(getDurationMinutes("11:00", "10:00")).toBeNull()
  })
})

describe("formatDuration", () => {
  it.each([
    [45, "45m"],
    [60, "1h"],
    [90, "1h 30m"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})

describe("formatActivityTimeRange", () => {
  it("handles missing start or end", () => {
    expect(formatActivityTimeRange()).toBeNull()
    expect(formatActivityTimeRange("09:00")).toBe("09:00")
  })

  it("adds the duration for a valid range", () => {
    expect(formatActivityTimeRange("09:00", "10:30")).toBe("09:00–10:30 · 1h 30m")
  })

  it("omits the duration for an inverted range", () => {
    expect(formatActivityTimeRange("10:30", "09:00")).toBe("10:30–09:00")
  })
})

describe("findActivityOverlaps", () => {
  it("reports overlapping activities in both directions", () => {
    const overlaps = findActivityOverlaps([
      { id: "a", title: "Museum", start_time: "09:00", end_time: "11:00" },
      { id: "b", title: "Lunch", start_time: "10:30", end_time: "12:00" },
      { id: "c", title: "Walk", start_time: "12:00", end_time: "13:00" },
    ])

    expect(overlaps.get("a")).toEqual(["Lunch"])
    expect(overlaps.get("b")).toEqual(["Museum"])
    // Back-to-back (12:00 end / 12:00 start) is not an overlap.
    expect(overlaps.has("c")).toBe(false)
  })

  it("ignores activities without a valid time range", () => {
    const overlaps = findActivityOverlaps([
      { id: "a", title: "Museum", start_time: "09:00", end_time: "11:00" },
      { id: "b", title: "Note" },
      { id: "c", title: "Bad", start_time: "10:00", end_time: "09:00" },
    ])

    expect(overlaps.size).toBe(0)
  })
})
