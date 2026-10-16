import { describe, expect, it } from "vitest"

import { costPayload, linkedCost } from "./linkedCost"

describe("linkedCost", () => {
  const expenses = [
    { amount: 50_000, currency: "IDR", transportation_id: null, accommodation_id: null },
    { amount: 750_000, currency: "IDR", transportation_id: "car-1", accommodation_id: null },
    { amount: 90, currency: "USD", transportation_id: null, accommodation_id: "car-1" },
  ]

  it("finds the expense linked to the booking of that kind", () => {
    expect(linkedCost(expenses, "transportation", "car-1")).toEqual({ amount: 750_000, currency: "IDR" })
    expect(linkedCost(expenses, "accommodation", "car-1")).toEqual({ amount: 90, currency: "USD" })
  })

  it("returns null without a linked expense", () => {
    expect(linkedCost(expenses, "transportation", "bus-9")).toBeNull()
    expect(linkedCost(undefined, "accommodation", "x")).toBeNull()
  })
})

describe("costPayload", () => {
  it("sends an entered amount", () => {
    expect(costPayload("750000", "IDR", "add")).toEqual({ amount: 750_000, currency: "IDR" })
    expect(costPayload("750000", "IDR", "edit")).toEqual({ amount: 750_000, currency: "IDR" })
  })

  it("removes the cost when it is cleared on edit, and adds nothing on add", () => {
    expect(costPayload("", "IDR", "edit")).toEqual({ amount: 0, currency: "IDR" })
    expect(costPayload("0", "IDR", "add")).toBeNull()
  })

  it("leaves the expense alone without a cost field", () => {
    expect(costPayload("750000", "IDR", "off")).toBeNull()
  })
})
