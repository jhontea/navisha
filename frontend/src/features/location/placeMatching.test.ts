import { describe, expect, it } from "vitest"

import { pickForDetails } from "./placeMatching"

const label = (p: { name: string }) => p.name

describe("pickForDetails", () => {
  it("keeps only the best-matching prediction", () => {
    const picked = pickForDetails(
      [{ name: "Mercure Jakarta Kota" }, { name: "Mercure Hotel Ancol" }, { name: "Hotel Ancol Indah" }],
      "Mercure Hotel Ancol",
      label,
    )
    expect(picked).toEqual([{ name: "Mercure Hotel Ancol" }])
  })

  it("keeps predictions that tie with the best, up to max", () => {
    const same = [{ name: "Mie Gacoan" }, { name: "Mie Gacoan" }, { name: "Mie Gacoan" }]
    expect(pickForDetails(same, "Mie Gacoan", label)).toHaveLength(2)
    expect(pickForDetails(same, "Mie Gacoan", label, 1)).toHaveLength(1)
  })

  it("returns nothing for no predictions", () => {
    expect(pickForDetails([], "Anything", label)).toEqual([])
  })
})
