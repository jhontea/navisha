import { describe, expect, it } from "vitest"

import type { Accommodation } from "@/features/accommodation/types"
import type { Activity } from "@/features/activity/types"
import type { Transportation } from "@/features/transportation/types"
import { dayRoute } from "./dayRoute"

const act = (id: string, start = "") => ({ id, type: "location", title: id, start_time: start }) as unknown as Activity
const stay = (id: string, checkIn: string, checkOut: string) =>
  ({ id, name: id, check_in: checkIn, check_out: checkOut }) as unknown as Accommodation
const leg = (id: string, departure: string, arrival?: string) =>
  ({ id, type: "flight", departure_datetime: departure, arrival_datetime: arrival }) as unknown as Transportation

const order = (stops: ReturnType<typeof dayRoute>) =>
  stops.map((s) => (s.kind === "activity" ? s.activity.id : `${s.stay.id}:${s.event}`))

describe("dayRoute", () => {
  const anjum = stay("anjum", "2027-01-10", "2027-01-14")
  const nozol = stay("nozol", "2027-01-14", "2027-01-17")

  it("arrival day: airports, then the hotel, then the evening place", () => {
    const stops = dayRoute(
      [act("cgk", "06:00"), act("jed", "15:55"), act("haram", "20:00")],
      [leg("SV817", "2027-01-10T10:00:00Z", "2027-01-10T15:55:00Z"), leg("bus", "2027-01-10T17:30:00Z")],
      [anjum, nozol],
      "2027-01-10",
    )
    expect(order(stops)).toEqual(["cgk", "jed", "anjum:check_in", "haram"])
  })

  it("a day at the hotel starts from it", () => {
    expect(order(dayRoute([act("arafat"), act("mina")], [], [anjum], "2027-01-12"))).toEqual(["anjum:night", "arafat", "mina"])
  })

  it("changeover day: check out, then check in at the next hotel", () => {
    const stops = dayRoute(
      [act("wada"), act("nabawi", "17:00")],
      [leg("train", "2027-01-14T09:00:00Z")],
      [anjum, nozol],
      "2027-01-14",
    )
    expect(order(stops)).toEqual(["wada", "anjum:check_out", "nozol:check_in", "nabawi"])
  })
})
