import { describe, expect, it } from "vitest"

import { splitTripTitle } from "./title"

describe("splitTripTitle", () => {
  it("splits at the first colon", () => {
    expect(splitTripTitle("Dream Tour Umrah 9 Hari: Makkah lalu Madinah")).toEqual({
      main: "Dream Tour Umrah 9 Hari",
      rest: "Makkah lalu Madinah",
    })
  })

  it("splits at a spaced dash", () => {
    expect(splitTripTitle("Japan – Tokyo & Kyoto")).toEqual({ main: "Japan", rest: "Tokyo & Kyoto" })
    expect(splitTripTitle("Bali - honeymoon")).toEqual({ main: "Bali", rest: "honeymoon" })
  })

  it("keeps hyphenated words and plain titles whole", () => {
    expect(splitTripTitle("Soekarno-Hatta layover")).toEqual({ main: "Soekarno-Hatta layover", rest: null })
    expect(splitTripTitle("Birthday trip bandung")).toEqual({ main: "Birthday trip bandung", rest: null })
    expect(splitTripTitle("Time 10:30 meetup")).toEqual({ main: "Time 10:30 meetup", rest: null })
  })
})
