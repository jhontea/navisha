import { describe, expect, it } from "vitest"

import { formatSavedAgo } from "./OfflineBanner"

const MIN = 60_000

describe("formatSavedAgo", () => {
  const now = Date.UTC(2026, 9, 27, 12, 0)
  it("says how long ago, then the date", () => {
    expect(formatSavedAgo(now - 20_000, now)).toBe("just now")
    expect(formatSavedAgo(now - 5 * MIN, now)).toBe("5 min ago")
    expect(formatSavedAgo(now - 60 * MIN, now)).toBe("1 hour ago")
    expect(formatSavedAgo(now - 5 * 60 * MIN, now)).toBe("5 hours ago")
    expect(formatSavedAgo(Date.UTC(2026, 9, 25, 12, 0), now)).toBe("25 Oct")
  })
})
