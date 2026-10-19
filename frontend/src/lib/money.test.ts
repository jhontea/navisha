import { describe, expect, it } from "vitest"

import { currencyDecimals, formatAmountInput, formatMoney } from "./money"

// F4: IDR totals were shown with cents ("Rp 68,340,303.69").
describe("formatMoney", () => {
  it("shows zero-decimal currencies without cents", () => {
    expect(formatMoney(68_340_303.69, "IDR")).toBe("Rp 68,340,304")
    expect(formatMoney(1200, "JPY")).toBe("¥ 1,200")
    expect(formatMoney(15000.4, "KRW")).toBe("₩ 15,000")
    expect(formatMoney(25000, "VND")).toBe("₫ 25,000")
  })

  it("shows two decimals for other currencies", () => {
    expect(formatMoney(12.5, "USD")).toBe("$ 12.50")
    expect(formatMoney(10, "EUR")).toBe("€ 10.00")
    expect(formatMoney(3.456, "SGD")).toBe("S$ 3.46")
  })

  it("puts the sign before the symbol", () => {
    expect(formatMoney(-3_340_303.69, "IDR")).toBe("-Rp 3,340,304")
    expect(formatMoney(-0.004, "USD")).toBe("$ 0.00")
  })

  it("falls back to the code for unknown currencies and treats NaN as 0", () => {
    expect(formatMoney(5, "XYZ")).toBe("XYZ 5.00")
    expect(formatMoney(Number.NaN, "IDR")).toBe("Rp 0")
  })
})

describe("currencyDecimals", () => {
  it("is case-insensitive", () => {
    expect(currencyDecimals("idr")).toBe(0)
    expect(currencyDecimals("usd")).toBe(2)
  })
})

describe("formatAmountInput", () => {
  it("returns an empty string for empty or non-numeric input", () => {
    expect(formatAmountInput("")).toBe("")
    expect(formatAmountInput("abc")).toBe("")
  })

  it("groups digits with en-US separators", () => {
    expect(formatAmountInput("1500000")).toBe("1,500,000")
  })

  it("strips separators and symbols before regrouping", () => {
    expect(formatAmountInput("1.500.000")).toBe("1,500,000")
    expect(formatAmountInput("Rp 1,500,000")).toBe("1,500,000")
  })

  it("keeps a lone zero", () => {
    expect(formatAmountInput("0")).toBe("0")
  })
})
