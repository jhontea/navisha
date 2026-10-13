import { describe, expect, it } from "vitest"

import { CATEGORY_COLORS, CATEGORY_ORDER, categoryRank, getCategoryColor } from "./categoryColors"

describe("category colors", () => {
  it("defines a color for every category in the fixed order", () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_COLORS[cat]?.bar).toMatch(/^bg-cat-/)
    }
  })

  it("gives every category a distinct bar color", () => {
    const bars = CATEGORY_ORDER.map((c) => CATEGORY_COLORS[c].bar)
    expect(new Set(bars).size).toBe(bars.length)
  })

  it("ranks categories by the fixed order, unknown last", () => {
    expect(categoryRank("accommodation")).toBe(0)
    expect(categoryRank("FOOD")).toBe(2)
    expect(categoryRank("other")).toBe(6)
    expect(categoryRank("unknown")).toBe(CATEGORY_ORDER.length)
  })

  it("falls back to other", () => {
    expect(getCategoryColor(undefined)).toBe(CATEGORY_COLORS.other)
    expect(getCategoryColor("nope")).toBe(CATEGORY_COLORS.other)
  })
})
