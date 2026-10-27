import { describe, expect, it } from "vitest"

import { addressAfterName } from "./place"

describe("addressAfterName", () => {
  it("drops a leading copy of the place name", () => {
    expect(addressAfterName("Senso-ji Temple", "Senso-ji Temple, 2-3-1 Asakusa, Tokyo")).toBe("2-3-1 Asakusa, Tokyo")
    expect(addressAfterName("senso-ji temple", "Senso-ji Temple - Asakusa")).toBe("Asakusa")
    expect(addressAfterName("Monas", "Monas")).toBe("")
  })

  it("keeps other addresses as they are", () => {
    expect(addressAfterName("Tokyo Skytree", "1 Chome-1-2 Oshiage, Tokyo")).toBe("1 Chome-1-2 Oshiage, Tokyo")
    expect(addressAfterName("Senso-ji", "Senso-ji Temple Road 5")).toBe("Senso-ji Temple Road 5")
    expect(addressAfterName("", "Tokyo")).toBe("Tokyo")
    expect(addressAfterName("Tokyo", null)).toBe("")
  })
})
