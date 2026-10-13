import { describe, expect, it } from "vitest"

import {
  CURRENCY_COUNTRY,
  CURRENCY_NAMES,
  SUPPORTED_CURRENCIES,
  getCurrencyFlag,
  getCurrencyLabel,
} from "./currency"

describe("currency metadata", () => {
  it("has a name and country for every supported currency", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_NAMES[code]).toBeTruthy()
      expect(CURRENCY_COUNTRY[code]).toHaveLength(2)
    }
  })
})

describe("getCurrencyFlag", () => {
  it("returns the regional flag for a known code", () => {
    expect(getCurrencyFlag("USD")).toBe("🇺🇸")
    expect(getCurrencyFlag("IDR")).toBe("🇮🇩")
    expect(getCurrencyFlag("EUR")).toBe("🇪🇺")
  })

  it("is case-insensitive", () => {
    expect(getCurrencyFlag("jpy")).toBe("🇯🇵")
  })

  it("falls back to a white flag for unknown codes", () => {
    expect(getCurrencyFlag("XYZ")).toBe("🏳️")
    expect(getCurrencyFlag("")).toBe("🏳️")
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
