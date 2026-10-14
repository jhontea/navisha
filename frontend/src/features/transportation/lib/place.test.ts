import { describe, expect, it } from "vitest"

import { parsePlace } from "./place"

describe("parsePlace", () => {
  it("pulls the airport code out of the name", () => {
    expect(parsePlace("Bandara Soekarno-Hatta (CGK), Jakarta")).toEqual({
      code: "CGK",
      name: "Bandara Soekarno-Hatta",
      detail: "Jakarta",
    })
  })

  it("keeps the rest of the address as detail", () => {
    expect(parsePlace("Bandara King Abdulaziz (JED), Jeddah, Saudi Arabia")).toEqual({
      code: "JED",
      name: "Bandara King Abdulaziz",
      detail: "Jeddah, Saudi Arabia",
    })
  })

  it("works without a code or a comma", () => {
    expect(parsePlace("Stasiun Haramain Madinah")).toEqual({ code: null, name: "Stasiun Haramain Madinah", detail: null })
    expect(parsePlace("Anjum Hotel, Makkah")).toEqual({ code: null, name: "Anjum Hotel", detail: "Makkah" })
  })

  it("ignores lowercase or long words in parentheses", () => {
    expect(parsePlace("Terminal (lama), Bandung")?.code).toBeNull()
    expect(parsePlace("Gambir (GMR)")).toEqual({ code: "GMR", name: "Gambir", detail: null })
  })

  it("returns null for empty input", () => {
    expect(parsePlace("")).toBeNull()
    expect(parsePlace("   ")).toBeNull()
    expect(parsePlace(null)).toBeNull()
  })
})
