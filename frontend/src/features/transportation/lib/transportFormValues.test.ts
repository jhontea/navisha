import { describe, expect, it } from "vitest"

import type { Transportation } from "../types"
import { fromLocalInput, toLocalInput, transportFormDefaults, transportInput } from "./transportFormValues"

describe("toLocalInput / fromLocalInput", () => {
  it("keeps wall-clock digits in both directions", () => {
    expect(toLocalInput("2026-05-10T06:30:00+00:00")).toBe("2026-05-10T06:30")
    expect(toLocalInput("2026-05-10T06:30:00Z")).toBe("2026-05-10T06:30")
    expect(toLocalInput("2026-05-10T06:30:00.123Z")).toBe("2026-05-10T06:30")
    expect(toLocalInput(null)).toBe("")
    expect(fromLocalInput("2026-05-10T06:30")).toBe("2026-05-10T06:30:00Z")
    expect(fromLocalInput("2026-05-10T06:30:00+07:00")).toBe("2026-05-10T06:30:00+07:00")
    expect(fromLocalInput("")).toBeNull()
  })
})

describe("transportInput", () => {
  const values = {
    ...transportFormDefaults(undefined, "JPY"),
    type: "train" as const,
    from_location: "Tokyo",
    to_location: "Kyoto",
    departure_datetime: "2026-11-01T07:00",
  }

  it("adds a cost only when enabled and an amount is entered", () => {
    expect(transportInput({ ...values, amount: "13000" }, "add").cost).toEqual({ amount: 13000, currency: "JPY" })
    expect(transportInput({ ...values, amount: "13000" }, "off").cost).toBeNull()
    expect(transportInput({ ...values, amount: "" }, "add").cost).toBeNull()
    expect(transportInput({ ...values, amount: "0" }, "add").cost).toBeNull()
  })

  it("on edit, sends the cost so it can be changed or cleared", () => {
    expect(transportInput({ ...values, amount: "15000" }, "edit").cost).toEqual({ amount: 15000, currency: "JPY" })
    expect(transportInput({ ...values, amount: "" }, "edit").cost).toEqual({ amount: 0, currency: "JPY" })
  })

  it("sends RFC3339 times and null for a missing arrival", () => {
    const input = transportInput(values, "off")
    expect(input.departure_datetime).toBe("2026-11-01T07:00:00Z")
    expect(input.arrival_datetime).toBeNull()
  })

  it("prefills an edit from the stored transport", () => {
    const initial = {
      type: "flight",
      from_location: "CGK",
      to_location: "DPS",
      departure_datetime: "2026-11-01T06:30:00Z",
      arrival_datetime: null,
      label: "GA 420",
    } as unknown as Transportation
    expect(transportFormDefaults(initial, "IDR")).toMatchObject({
      type: "flight",
      label: "GA 420",
      departure_datetime: "2026-11-01T06:30",
      arrival_datetime: "",
      currency: "IDR",
    })
  })

  it("prefills the linked cost on edit", () => {
    expect(transportFormDefaults(undefined, "IDR", { amount: 750000, currency: "USD" })).toMatchObject({
      amount: "750000",
      currency: "USD",
    })
  })
})

describe("transportFormDefaults departure prefill", () => {
  it("uses defaultDeparture only when adding", () => {
    expect(transportFormDefaults(undefined, "IDR", null, "2026-10-31T00:00").departure_datetime).toBe("2026-10-31T00:00")
    expect(transportFormDefaults(undefined, "IDR").departure_datetime).toBe("")
  })
})
