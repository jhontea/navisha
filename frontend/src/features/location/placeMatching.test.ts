import { describe, expect, it } from "vitest"

import { pickForDetails, tokens, weightedJaccard } from "./placeMatching"

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

describe("weightedJaccard spelling variants", () => {
  it("treats center and centre as the same word", () => {
    expect(weightedJaccard("Maxwell Food Centre", "Maxwell Food Center")).toBe(1)
    expect(tokens("Suntec City Convention Center")).toContain("centre")
  })

  it("leaves other names untouched", () => {
    expect(tokens("Gardens by the Bay")).toEqual(["gardens", "by", "bay"])
    expect(tokens("Central Market")).toEqual(["central", "market"])
    expect(weightedJaccard("Maxwell Food Centre", "Amoy Street Food Centre")).toBeLessThan(0.45)
  })
})
