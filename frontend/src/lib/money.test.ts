import { describe, expect, it } from "vitest"

import { currencyDecimals, formatAmountInput, formatAmountValue, formatMoney, unformatAmountInput } from "./money"

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
    expect(formatMoney(1250.5, "SAR")).toBe("SAR 1,250.50")
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

  it("cuts the fraction to the currency decimals", () => {
    expect(formatAmountInput("1500000.75")).toBe("1,500,000")
    expect(formatAmountInput("1500.756", 2)).toBe("1,500.75")
    expect(formatAmountInput("10.50", 0)).toBe("10")
    expect(formatAmountInput("10.50", 2)).toBe("10.50")
  })

  it("keeps a trailing dot and a leading fraction while typing", () => {
    expect(formatAmountInput("10.", 2)).toBe("10.")
    expect(formatAmountInput(".5", 2)).toBe("0.5")
    expect(formatAmountInput(".", 2)).toBe("0.")
    expect(formatAmountInput(".", 0)).toBe("")
  })

  it("treats several dots as grouping and drops leading zeros", () => {
    expect(formatAmountInput("1.2.3", 2)).toBe("123")
    expect(formatAmountInput("1.500.000", 2)).toBe("1,500,000")
    expect(formatAmountInput("007", 0)).toBe("7")
  })
})

describe("formatAmountValue", () => {
  it("rounds stored amounts to the currency decimals without typing heuristics", () => {
    expect(formatAmountValue(123456.789, 0)).toBe("123,457")
    expect(formatAmountValue(1234.5, 0)).toBe("1,235")
    expect(formatAmountValue(650000, 0)).toBe("650,000")
  })

  it("pads like formatMoney", () => {
    expect(formatAmountValue(12.5, 2)).toBe("12.50")
    expect(formatAmountValue(1500.5, 2)).toBe("1,500.50")
    expect(formatAmountValue(Number.NaN, 2)).toBe("")
  })
})

describe("unformatAmountInput", () => {
  it("round-trips a decimal budget (1500.5 USD)", () => {
    const shown = formatAmountValue(1500.5, 2)
    expect(shown).toBe("1,500.50")
    expect(Number(unformatAmountInput(shown))).toBe(1500.5)
  })

  it("drops grouping and keeps the empty string", () => {
    expect(unformatAmountInput("1,500,000")).toBe("1500000")
    expect(unformatAmountInput("")).toBe("")
  })
})
