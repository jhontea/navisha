import { describe, expect, it } from "vitest"
import { formatTripRange } from "./TravelDateRangePicker"

describe("formatTripRange", () => {
  it("shows a range within one year without the year", () => {
    expect(formatTripRange("2026-10-24", "2026-10-25")).toBe("Oct 24 – Oct 25")
  })
  it("collapses a one-day trip to a single date", () => {
    expect(formatTripRange("2026-10-24", "2026-10-24")).toBe("Oct 24")
  })
  it("adds the year to both dates when the trip crosses a year", () => {
    expect(formatTripRange("2026-12-30", "2027-01-02")).toBe("Dec 30, 2026 – Jan 2, 2027")
  })
})
