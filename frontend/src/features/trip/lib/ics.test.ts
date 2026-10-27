import { describe, expect, it } from "vitest"

import type { Activity } from "@/features/activity/types"
import type { Accommodation } from "@/features/accommodation/types"
import type { Transportation } from "@/features/transportation/types"
import type { Day } from "../types"
import { buildTripIcs, escapeText, foldLine, icsFileName } from "./ics"

const day = (id: string, date: string) => ({ id, date }) as Day
const activity = (over: Partial<Activity>) =>
  ({ id: "a1", day_id: "d1", type: "location", title: "Visit", start_time: "", end_time: "", payload: null, ...over }) as Activity
const transport = (over: Partial<Transportation>) =>
  ({ id: "t1", type: "flight", label: "", from_location: "", to_location: "", reference_number: "", departure_datetime: null, arrival_datetime: null, ...over }) as Transportation
const stay = (over: Partial<Accommodation>) =>
  ({ id: "s1", name: "Hotel A", location_name: "", check_in: "2027-02-27", check_out: "2027-03-01", check_in_time: null, check_out_time: null, confirmation_number: "", ...over }) as Accommodation

const now = new Date("2026-10-27T08:09:10.123Z")
const build = (input: Partial<Parameters<typeof buildTripIcs>[0]>) =>
  buildTripIcs({ trip: { title: "Tokyo", days: [day("d1", "2027-02-27")] }, activitiesByDay: {}, transports: [], stays: [], now, ...input })
const events = (text: string) => text.split("BEGIN:VEVENT").slice(1)

describe("trip .ics", () => {
  it("writes a valid empty calendar with CRLF lines", () => {
    const { text, count } = build({})
    expect(count).toBe(0)
    expect(text).toBe(
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Navisha//Trip itinerary//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Tokyo\r\nEND:VCALENDAR\r\n",
    )
  })

  it("turns timed activities into floating events and skips untimed ones and to-dos", () => {
    const { text, count } = build({
      activitiesByDay: {
        d1: [
          activity({ id: "a1", start_time: "09:30", end_time: "11:00", payload: { location_name: "Senso-ji", address: "Asakusa", notes: "Go early" } as Activity["payload"] }),
          activity({ id: "a2", type: "note", title: "Dinner", start_time: "19:00:00", payload: { content: "Book table" } }),
          activity({ id: "a3", title: "No time" }),
          activity({ id: "a4", type: "todo", title: "Pack", start_time: "08:00" }),
        ],
      },
    })
    expect(count).toBe(2)
    const [first, second] = events(text)
    expect(first).toContain("UID:activity-a1@navisha\r\nDTSTAMP:20261027T080910Z\r\nDTSTART:20270227T093000\r\nDTEND:20270227T110000\r\n")
    expect(first).toContain("LOCATION:Senso-ji\r\nDESCRIPTION:Go early\r\n")
    expect(second).toContain("DTSTART:20270227T190000\r\nDTEND:20270227T200000\r\n")
    expect(second).toContain("DESCRIPTION:Book table\r\n")
    expect(text).not.toContain("No time")
    expect(text).not.toContain("Pack")
  })

  it("omits location and description when they are empty", () => {
    const { text } = build({
      activitiesByDay: {
        d1: [
          activity({ id: "a1", start_time: "09:00", payload: { location_name: "", address: "", notes: "" } as Activity["payload"] }),
          activity({ id: "a2", type: "note", start_time: "10:00", payload: { content: "" } }),
        ],
      },
    })
    expect(text).not.toContain("LOCATION")
    expect(text).not.toContain("DESCRIPTION")
  })

  it("moves an end time past midnight to the next day", () => {
    const { text } = build({ activitiesByDay: { d1: [activity({ start_time: "23:00", end_time: "01:30" })] } })
    expect(text).toContain("DTSTART:20270227T230000\r\nDTEND:20270228T013000\r\n")
  })

  it("gives an activity whose end equals its start one hour, not a day", () => {
    const { text } = build({ activitiesByDay: { d1: [activity({ start_time: "09:30", end_time: "09:30" })] } })
    expect(text).toContain("DTSTART:20270227T093000\r\nDTEND:20270227T103000\r\n")
  })

  it("keeps transport wall-clock digits with no timezone conversion", () => {
    const { text, count } = build({
      transports: [
        transport({ id: "t1", label: "GA 880", from_location: "CGK", to_location: "NRT", reference_number: "ABC123", departure_datetime: "2027-02-27T20:00:00Z", arrival_datetime: "2027-02-28T05:45:00Z" }),
        transport({ id: "t2", type: "train", departure_datetime: "2027-03-01T23:30:00Z" }),
        transport({ id: "t3" }),
      ],
    })
    expect(count).toBe(2)
    const [flight, train] = events(text)
    expect(flight).toContain("DTSTART:20270227T200000\r\nDTEND:20270228T054500\r\nSUMMARY:GA 880: CGK → NRT\r\n")
    expect(flight).toContain("DESCRIPTION:Booking ref: ABC123\r\n")
    expect(train).toContain("DTSTART:20270301T233000\r\nDTEND:20270302T003000\r\nSUMMARY:Train\r\n")
  })

  it("adds check-in and check-out with the usual times when none are set", () => {
    const { text, count } = build({
      stays: [stay({ location_name: "Shinjuku", confirmation_number: "HX9" }), stay({ id: "s2", name: "B", check_in_time: "15:30", check_out_time: "10:00" })],
    })
    expect(count).toBe(4)
    const [checkIn, checkOut, otherIn, otherOut] = events(text)
    expect(checkIn).toContain("UID:stay-in-s1@navisha")
    expect(checkIn).toContain("DTSTART:20270227T140000\r\nDTEND:20270227T150000\r\nSUMMARY:Check-in: Hotel A\r\nLOCATION:Shinjuku\r\nDESCRIPTION:Confirmation: HX9\r\n")
    expect(checkOut).toContain("DTSTART:20270301T120000\r\nDTEND:20270301T130000\r\nSUMMARY:Check-out: Hotel A")
    expect(otherIn).toContain("DTSTART:20270227T153000")
    expect(otherOut).toContain("DTSTART:20270301T100000")
  })

  it("escapes text values", () => {
    expect(escapeText("a\\b; c, d\ne")).toBe("a\\\\b\\; c\\, d\\ne")
    expect(escapeText("a\rb\r\nc")).toBe("a\\nb\\nc")
    const { text } = build({ trip: { title: "Bali, Lombok; 2027", days: [] } })
    expect(text).toContain("X-WR-CALNAME:Bali\\, Lombok\\; 2027\r\n")
  })

  it("folds long lines at 75 octets without splitting characters", () => {
    const ascii = foldLine(`SUMMARY:${"x".repeat(100)}`)
    expect(ascii.split("\r\n").map((l) => l.length)).toEqual([75, 34])
    const multibyte = foldLine(`SUMMARY:${"東京".repeat(20)}🏯`)
    const encoder = new TextEncoder()
    for (const part of multibyte.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75)
    expect(multibyte.split("\r\n").map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(`SUMMARY:${"東京".repeat(20)}🏯`)
  })

  it("makes a safe file name", () => {
    expect(icsFileName('Tokyo: "Spring" 2027?')).toBe("Tokyo- -Spring- 2027-.ics")
    expect(icsFileName("Bali / Lombok")).toBe("Bali - Lombok.ics")
    expect(icsFileName("   ")).toBe("trip.ics")
    expect(icsFileName("東京 🌸")).toBe("東京 🌸.ics")
  })
})
