import { describe, expect, it } from "vitest"

import type { Accommodation } from "@/features/accommodation/types"
import type { Transportation } from "@/features/transportation/types"
import type { Activity } from "../types"
import type { TimelineEntry } from "./timeline"
import { legBetween, legsByPair, travelLabel, travelText, type TravelLeg } from "./travel"

const act = (id: string): TimelineEntry => ({ kind: "activity", activity: { id } as Activity })
const stay = (id: string, event: "check_in" | "check_out"): TimelineEntry => ({
  kind: "accommodation",
  data: { id } as Accommodation,
  event,
})
const transport = (id: string): TimelineEntry => ({ kind: "transport", data: { id } as Transportation })

const leg = (over: Partial<TravelLeg> = {}): TravelLeg => ({
  from: { kind: "activity", id: "a" },
  to: { kind: "activity", id: "b" },
  mode: "walk",
  minutes: 12,
  distance_m: 900,
  source: "route",
  ...over,
})

describe("legBetween", () => {
  const legs = legsByPair([
    leg(),
    leg({ from: { kind: "accommodation", id: "h", event: "check_out" }, to: { kind: "activity", id: "a" } }),
  ])

  it("matches adjacent entries by kind, id and stay event", () => {
    expect(legBetween(legs, act("a"), act("b"))?.minutes).toBe(12)
    expect(legBetween(legs, stay("h", "check_out"), act("a"))).toBeDefined()
  })

  it("skips pairs that are reversed, use the other stay event, or involve transport", () => {
    expect(legBetween(legs, act("b"), act("a"))).toBeUndefined()
    expect(legBetween(legs, stay("h", "check_in"), act("a"))).toBeUndefined()
    expect(legBetween(legs, transport("a"), act("b"))).toBeUndefined()
    expect(legBetween(legs, act("a"), undefined)).toBeUndefined()
    expect(legBetween(legsByPair(undefined), act("a"), act("b"))).toBeUndefined()
  })
})

describe("travelText / travelLabel", () => {
  it("shows a routed walk as is", () => {
    expect(travelText(leg())).toBe("12 min walk")
    expect(travelLabel(leg())).toBe("12 minutes on foot.")
  })

  it("marks drives and straight-line estimates as approximate", () => {
    expect(travelText(leg({ mode: "drive", minutes: 25 }))).toBe("≈ 25 min drive")
    expect(travelText(leg({ source: "estimate" }))).toBe("≈ 12 min walk")
    expect(travelText(leg({ mode: "drive", minutes: 137 }))).toBe("≈ 2h 17m drive")
    expect(travelText(leg({ mode: "drive", minutes: 180 }))).toBe("≈ 3h drive")
    expect(travelText(leg({ mode: "drive", minutes: 60 }))).toBe("≈ 1h drive")
    expect(travelLabel(leg({ mode: "drive", minutes: 1 }))).toBe("About 1 minute by car.")
  })

  it("adds the gap when the schedule is tight", () => {
    const tight = leg({ mode: "drive", minutes: 25, gap_minutes: 15, tight: true })
    expect(travelLabel(tight)).toBe("About 25 minutes by car. Only 15 minutes between these plans.")
    expect(travelLabel(leg({ mode: "drive", minutes: 137, tight: true, gap_minutes: 61 }))).toBe(
      "About 2 hours 17 minutes by car. Only 1 hour 1 minute between these plans.",
    )
    expect(travelLabel(leg({ gap_minutes: 30, tight: false }))).toBe("12 minutes on foot.")
  })
})
