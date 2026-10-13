import { describe, expect, it } from "vitest"

import {
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
  getCurrencyLabel,
  getCurrencySymbol,
} from "./currency"

describe("currency metadata", () => {
  it("has a name and a symbol for every supported currency", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_NAMES[code]).toBeTruthy()
      expect(CURRENCY_SYMBOLS[code]).toBeTruthy()
    }
  })
})

// F7: flag emoji rendered as letters on Windows; symbols are used instead.
describe("getCurrencySymbol", () => {
  it("returns the symbol for a known code", () => {
    expect(getCurrencySymbol("USD")).toBe("$")
    expect(getCurrencySymbol("IDR")).toBe("Rp")
    expect(getCurrencySymbol("EUR")).toBe("€")
  })

  it("is case-insensitive", () => {
    expect(getCurrencySymbol("jpy")).toBe("¥")
  })

  it("falls back to the code for unknown currencies", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ")
  })

  it("never returns regional-indicator flag characters", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(getCurrencySymbol(code)).not.toMatch(/\uD83C[\uDDE6-\uDDFF]/)
    }
  })
})

describe("getCurrencyLabel", () => {
  it("prefers the API-provided name", () => {
    expect(getCurrencyLabel("USD", "Dollar")).toBe("USD - Dollar")
  })

  it("falls back to the local name, then the code", () => {
    expect(getCurrencyLabel("IDR")).toBe("IDR - Indonesian Rupiah")
    expect(getCurrencyLabel("XYZ")).toBe("XYZ - XYZ")
  })
})
