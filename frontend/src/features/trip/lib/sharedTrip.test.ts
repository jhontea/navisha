import { describe, expect, it } from "vitest"

import { dayContentSummary, defaultOpenDayId, sharedTripPreview, sharedTripUrl } from "./sharedTrip"
import type { PublicTripActivity } from "../types"

describe("sharedTripPreview", () => {
  it("summarises dates, length and destination", () => {
    const preview = sharedTripPreview({
      title: "Japan Spring 2026",
      description: "Japan",
      start_date: "2026-05-10",
      end_date: "2026-05-19",
      cover_image_url: "",
    })
    expect(preview.title).toBe("Japan Spring 2026")
    expect(preview.description).toBe("10–19 May 2026 · 10 days · Japan. Day-by-day plan shared from Navisha.")
  })

  it("omits a missing destination", () => {
    const preview = sharedTripPreview({
      title: "Weekend",
      description: "",
      start_date: "2026-06-06",
      end_date: "2026-06-07",
      cover_image_url: "",
    })
    expect(preview.description).toBe("6–7 Jun 2026 · 2 days. Day-by-day plan shared from Navisha.")
  })

  it("encodes the token in the API URL", () => {
    expect(sharedTripUrl("a/b c")).toMatch(/\/shared-trips\/a%2Fb%20c$/)
  })
})

describe("defaultOpenDayId", () => {
  const days = [
    { id: "d1", date: "2027-01-10" },
    { id: "d2", date: "2027-01-11" },
    { id: "d3", date: "2027-01-12" },
  ]

  it("opens today's day while the trip is under way", () => {
    expect(defaultOpenDayId(days, new Date(2027, 0, 11, 9))).toBe("d2")
  })

  it("opens the first day before or after the trip", () => {
    expect(defaultOpenDayId(days, new Date(2026, 11, 1))).toBe("d1")
    expect(defaultOpenDayId(days, new Date(2027, 1, 1))).toBe("d1")
  })

  it("has nothing to open without days", () => {
    expect(defaultOpenDayId([])).toBeNull()
  })
})

describe("dayContentSummary", () => {
  const a = (type: "location" | "note") => ({ type }) as PublicTripActivity

  it("counts places and notes", () => {
    expect(dayContentSummary({ activities: [a("location"), a("location"), a("note")] })).toBe("2 places · 1 note")
    expect(dayContentSummary({ activities: [a("location")] })).toBe("1 place")
    expect(dayContentSummary({ activities: [] })).toBe("")
  })
})
