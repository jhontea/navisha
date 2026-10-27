import { describe, expect, it } from "vitest"

import { getDefaultTripCover } from "./cover"

describe("getDefaultTripCover", () => {
  it.each([
    ["Seoul, South Korea", "navisha-seoul.png"],
    ["Busan, Korea Selatan", "navisha-seoul.png"],
    ["Makkah & Madinah, Saudi Arabia", "navisha-saudi-arabia.png"],
    ["Jeddah", "navisha-saudi-arabia.png"],
    ["Tokyo, Japan", "navisha-tokyo.png"],
  ])("%s -> %s", (destination, file) => {
    expect(getDefaultTripCover(destination)).toContain(`/trip-covers/${file}`)
  })

  it("returns no cover for an unknown destination", () => {
    expect(getDefaultTripCover("Reykjavik, Iceland")).toBe("")
  })
})
