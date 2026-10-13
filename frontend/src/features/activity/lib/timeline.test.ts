import { describe, expect, it } from "vitest"

import type { Accommodation } from "@/features/accommodation/types"
import type { Transportation } from "@/features/transportation/types"
import { buildStaticItems, dateMatches, extractDate, extractTime, toSortKey } from "./timeline"

const transport = (id: string, departure: string) =>
  ({ id, type: "flight", departure_datetime: departure }) as unknown as Transportation
const stay = (id: string, checkIn: string, checkOut: string) =>
  ({ id, name: id, check_in: checkIn, check_out: checkOut }) as unknown as Accommodation

describe("extractTime / extractDate", () => {
  it("reads the wall-clock time literally, ignoring the offset", () => {
    expect(extractTime("2026-05-10T06:30:00+00:00")).toBe("06:30")
    expect(extractTime("2026-05-10T23:59:00+09:00")).toBe("23:59")
    expect(extractDate("2026-05-10T23:59:00-05:00")).toBe("2026-05-10")
  })

  it("returns null for missing or malformed values", () => {
    expect(extractTime(undefined)).toBeNull()
    expect(extractTime("2026-05-10")).toBeNull()
    expect(extractDate("10/05/2026")).toBeNull()
  })
})

describe("toSortKey", () => {
  it("uses the time of a datetime and sorts missing values last", () => {
    expect(toSortKey("2026-05-10T06:30:00Z")).toBe("06:30")
    expect(toSortKey("09:15")).toBe("09:15")
    expect(toSortKey(null)).toBe("99:99")
  })
})

describe("dateMatches", () => {
  it("matches plain dates and datetimes on the same calendar day", () => {
    expect(dateMatches("2026-05-10", "2026-05-10")).toBe(true)
    expect(dateMatches("2026-05-10T23:00:00+09:00", "2026-05-10")).toBe(true)
    expect(dateMatches("2026-05-11T00:30:00+09:00", "2026-05-10")).toBe(false)
    expect(dateMatches(null, "2026-05-10")).toBe(false)
  })
})

describe("buildStaticItems", () => {
  it("keeps only items on the day, ordered by time", () => {
    const items = buildStaticItems(
      [
        transport("evening", "2026-05-10T18:00:00+00:00"),
        transport("morning", "2026-05-10T06:30:00+00:00"),
        transport("other-day", "2026-05-11T09:00:00+00:00"),
      ],
      [stay("hotel", "2026-05-10", "2026-05-14")],
      "2026-05-10",
    )
    expect(items.map((i) => (i.kind === "transport" ? i.data.id : `${i.data.id}:${i.event}`))).toEqual([
      "morning",
      "hotel:check_in", // 14:00
      "evening",
    ])
  })

  it("places check-out (12:00) before check-in (14:00) on a changeover day", () => {
    const items = buildStaticItems(
      [],
      [stay("first", "2026-05-10", "2026-05-14"), stay("second", "2026-05-14", "2026-05-19")],
      "2026-05-14",
    )
    expect(items.map((i) => (i.kind === "accommodation" ? `${i.data.id}:${i.event}` : ""))).toEqual([
      "first:check_out",
      "second:check_in",
    ])
  })

  it("returns nothing for an empty day", () => {
    expect(buildStaticItems([], [], "2026-05-10")).toEqual([])
  })
})
