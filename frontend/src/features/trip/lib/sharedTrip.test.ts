import { describe, expect, it } from "vitest"

import { sharedTripPreview, sharedTripUrl } from "./sharedTrip"

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
