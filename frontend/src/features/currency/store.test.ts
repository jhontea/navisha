import { describe, expect, it } from "vitest"

import { upsertRecord, type ConversionRecord } from "./store"

const rec = (from: string, to: string, amount: number, id = `${from}${to}${amount}`): ConversionRecord => ({
  id,
  from,
  to,
  amount,
  convertedAmount: amount * 2,
  rate: 2,
  createdAt: 1,
})
const input = (from: string, to: string, amount: number) => ({ from, to, amount, convertedAmount: amount * 3, rate: 3 })

describe("upsertRecord", () => {
  it("puts a new conversion on top", () => {
    const out = upsertRecord([rec("USD", "IDR", 1)], input("USD", "IDR", 150), 5, "new")
    expect(out.map((r) => r.amount)).toEqual([150, 1])
    expect(out[0]).toMatchObject({ id: "new", createdAt: 5 })
  })

  it("moves a non-adjacent duplicate to the top instead of adding another", () => {
    const list = [rec("USD", "IDR", 10), rec("USD", "IDR", 100), rec("EUR", "IDR", 1)]
    const out = upsertRecord(list, input("USD", "IDR", 100), 9, "n")
    expect(out.map((r) => r.amount)).toEqual([100, 10, 1])
    expect(out[0].rate).toBe(3)
  })

  it("removes every matching entry (legacy duplicates)", () => {
    const list = [rec("USD", "IDR", 100, "a"), rec("USD", "IDR", 10), rec("USD", "IDR", 100, "b")]
    expect(upsertRecord(list, input("USD", "IDR", 100), 9, "n")).toHaveLength(2)
  })

  it("treats a different from/to/amount as a separate entry", () => {
    const list = [rec("USD", "IDR", 100)]
    expect(upsertRecord(list, input("IDR", "USD", 100), 9, "n")).toHaveLength(2)
    expect(upsertRecord(list, input("USD", "EUR", 100), 9, "n")).toHaveLength(2)
  })

  it("keeps at most 8 entries, dropping the oldest", () => {
    const list = Array.from({ length: 8 }, (_, i) => rec("USD", "IDR", i + 1))
    const out = upsertRecord(list, input("USD", "IDR", 99), 9, "n")
    expect(out).toHaveLength(8)
    expect(out[0].amount).toBe(99)
    expect(out.map((r) => r.amount)).not.toContain(8)
  })
})
