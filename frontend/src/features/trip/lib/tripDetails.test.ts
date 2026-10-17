import { describe, expect, it } from "vitest"

import {
  MAX_DESCRIPTION,
  emptyTripDetails,
  parseBudget,
  toPlace,
  tripDetailsRecap,
  tripDetailsToInput,
  validateTripDetails,
  withChildren,
  type TripDetailsForm,
} from "./tripDetails"

const START = "2026-11-07"
const END = "2026-11-08"

// The fan meeting trip: drive from home in Majalengka to Ancol with a child.
function fanMeeting(): TripDetailsForm {
  return {
    ...emptyTripDetails(START),
    origin: {
      text: "Majalengka",
      picked: { label: "Majalengka", address: "Majalengka, West Java", lat: -6.83, lng: 108.22 },
    },
    transportMode: "car",
    eventName: "Fan Meeting",
    venue: {
      text: "Beach City International Stadium",
      picked: { label: "Beach City International Stadium", address: "Ancol", lat: -6.12, lng: 106.84 },
    },
    eventStart: "14:00",
    eventEnd: "17:00",
    adults: "2",
    children: 1,
    childAges: ["5"],
    needs: ["hotel_near_venue", "kids_playground"],
  }
}

describe("tripDetailsToInput", () => {
  it("sends nothing when the step was left empty", () => {
    expect(tripDetailsToInput(emptyTripDetails(START))).toEqual({})
  })

  it("builds the event-trip fields", () => {
    expect(tripDetailsToInput(fanMeeting())).toEqual({
      origin: { label: "Majalengka", address: "Majalengka, West Java", lat: -6.83, lng: 108.22 },
      transport_mode: "car",
      event: {
        name: "Fan Meeting",
        venue: { label: "Beach City International Stadium", address: "Ancol", lat: -6.12, lng: 106.84 },
        date: START,
        start_time: "14:00",
        end_time: "17:00",
      },
      travelers: { adults: 2, children: 1, child_ages: [5] },
      needs: ["hotel_near_venue", "kids_playground"],
    })
  })

  it("drops a picked place once the text no longer matches it", () => {
    expect(toPlace({ text: "Cirebon", picked: { label: "Majalengka", lat: 1, lng: 2 } })).toEqual({ label: "Cirebon" })
    expect(toPlace({ text: "  ", picked: null })).toBeUndefined()
  })
})

describe("validateTripDetails", () => {
  it("accepts an empty step and the full fan meeting", () => {
    expect(validateTripDetails(emptyTripDetails(START), START, END)).toBeNull()
    expect(validateTripDetails(fanMeeting(), START, END)).toBeNull()
  })

  it.each<[string, Partial<TripDetailsForm>, RegExp]>([
    ["event without a venue", { venue: { text: "", picked: null } }, /venue/],
    ["event without a name", { eventName: " " }, /event name/],
    ["event before the trip", { eventDate: "2026-11-06" }, /within your trip dates/],
    ["event after the trip", { eventDate: "2026-11-09" }, /within your trip dates/],
    ["event without times", { eventStart: "" }, /start and end times/],
    ["event ending first", { eventEnd: "13:00" }, /end after it starts/],
    ["children without adults", { adults: "" }, /adults/],
    ["missing child age", { childAges: [""] }, /child's age/],
    ["adult as a child", { childAges: ["18"] }, /child's age/],
  ])("rejects %s", (_, patch, message) => {
    expect(validateTripDetails({ ...fanMeeting(), ...patch }, START, END)).toMatch(message)
  })

  it("asks for the rest of the event once one field is filled", () => {
    expect(validateTripDetails({ ...emptyTripDetails(START), eventStart: "14:00" }, START, END)).toMatch(/event name/)
  })
})

describe("withChildren", () => {
  it("keeps entered ages and resizes the list", () => {
    const two = withChildren({ ...fanMeeting() }, 2)
    expect(two.childAges).toEqual(["5", ""])
    expect(withChildren(two, 0).childAges).toEqual([])
    expect(withChildren(two, 99).children).toBe(10)
  })
})

describe("tripDetailsRecap", () => {
  it("summarises the details for the review step", () => {
    expect(tripDetailsRecap(fanMeeting())).toEqual([
      { label: "From", value: "Majalengka · Car" },
      { label: "Event", value: "Fan Meeting · Beach City International Stadium · 2026-11-07 14:00–17:00" },
      { label: "Travelers", value: "2 adults, 1 child (5 y)" },
      { label: "Needs", value: "Hotel near the venue, Kids playground" },
    ])
  })
})

describe("parseBudget", () => {
  it("reads thousand separators and rejects text", () => {
    expect(parseBudget("")).toBeUndefined()
    expect(parseBudget("3.000.000")).toBe(3000000)
    expect(parseBudget("3,000,000")).toBe(3000000)
    expect(parseBudget("tiga juta")).toBeNull()
  })
})

it("allows a 500-character description, matching the backend", () => {
  expect(MAX_DESCRIPTION).toBe(500)
})

describe("departure time", () => {
  it("is sent and recapped with a starting point", () => {
    const form = { ...fanMeeting(), departTime: "07:30" }
    expect(validateTripDetails(form, START, END)).toBeNull()
    expect(tripDetailsToInput(form).depart_time).toBe("07:30")
    expect(tripDetailsRecap(form)[0]).toEqual({ label: "From", value: "Majalengka · Car · leave ~07:30" })
  })

  it("is dropped without a starting point", () => {
    const form = { ...fanMeeting(), origin: { text: "", picked: null }, departTime: "07:30" }
    expect(tripDetailsToInput(form).depart_time).toBeUndefined()
    expect(validateTripDetails(form, START, END)).toBeNull()
  })

  it("must be HH:MM", () => {
    expect(validateTripDetails({ ...fanMeeting(), departTime: "7:3" }, START, END)).toMatch(/HH:MM/)
  })
})
