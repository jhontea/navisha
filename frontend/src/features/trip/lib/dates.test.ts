import { describe, expect, it } from "vitest"

import { getInclusiveDayCount } from "./dates"

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
