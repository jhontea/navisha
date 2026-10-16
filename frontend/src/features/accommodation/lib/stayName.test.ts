import { describe, expect, it } from "vitest"

import { stayNameFromPlace } from "./stayName"

describe("stayNameFromPlace", () => {
  it("names an unnamed stay after the picked place", () => {
    expect(stayNameFromPlace("", { location_name: "Mercure Jakarta Ancol" })).toBe("Mercure Jakarta Ancol")
    expect(stayNameFromPlace("  ", { location_name: " Mercure " })).toBe("Mercure")
  })

  it("keeps a name the traveller typed, and ignores nameless places", () => {
    expect(stayNameFromPlace("Our hotel", { location_name: "Mercure" })).toBeNull()
    expect(stayNameFromPlace("", { location_name: "" })).toBeNull()
  })
})
