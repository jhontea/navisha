import { describe, expect, it } from "vitest"

import type { ActivityDraft, TripDraft } from "../types"
import { distanceKm, flagFarFromVenue } from "./venueRadius"

// Beach City International Stadium, Ancol.
const VENUE = { lat: -6.1214, lng: 106.8455, date: "2026-11-07" }

function at(title: string, start: string, lat: number | null, lng: number | null): ActivityDraft {
  return {
    type: "location", title, start_time: start, end_time: "", location_name: title,
    address: "", lat, lng, google_place_id: "", category: "kuliner", notes: "",
    location_verification: "verified",
  }
}

function draft(): TripDraft {
  return {
    title: "Fan meeting", destination: "Ancol, Jakarta", total_days: 3, travel_style: "", summary: "",
    base_currency: "IDR", budget: 0, tips: [],
    days: [
      { day_number: 1, date: "2026-11-07", theme: "", activities: [
        at("Sarapan di rest area KM 57", "07:00", -6.38, 107.2), // on the drive, before arriving
        at("Makan siang di Bandar Djakarta", "12:30", -6.125, 106.84),
        at("Makan malam di Mangga Dua Square", "19:00", -6.137, 106.83 - 0.04), // ~6 km
      ] },
      { day_number: 2, date: "2026-11-08", theme: "", activities: [
        at("Playground umum", "08:00", -6.13, 106.84),
        at("Sarapan jauh", "09:00", -6.2, 106.82),
        at("Makan siang di Cikampek", "15:00", -6.4, 107.45), // after leaving for home
      ] },
      { day_number: 3, date: "2026-11-09", theme: "", activities: [at("Rumah makan di Majalengka", "12:00", -6.83, 108.22)] },
    ],
    transport_legs: [
      { mode: "car", label: "", from_location: "Majalengka", to_location: "Ancol", departure_date: "2026-11-07", departure_time: "06:00", arrival_date: "2026-11-07", arrival_time: "11:00", estimated_cost: 0, notes: "" },
      { mode: "car", label: "", from_location: "Ancol", to_location: "Majalengka", departure_date: "2026-11-08", departure_time: "13:00", arrival_date: "2026-11-08", arrival_time: "18:00", estimated_cost: 0, notes: "" },
    ],
    lodging: [{
      name: "Mercure Hotel Ancol", location_name: "Mercure Hotel Ancol", place_query: "", city: "",
      check_in_date: "2026-11-07", check_in_time: "14:00", check_out_date: "2026-11-08", check_out_time: "12:00",
      estimated_cost_per_night: 0, notes: "", address: "", lat: -6.12, lng: 106.83, google_place_id: "",
    }],
  }
}

const status = (d: TripDraft) =>
  Object.fromEntries(d.days.flatMap((day) => day.activities.map((a) => [a.title, a.location_verification])))

describe("flagFarFromVenue", () => {
  it("flags places far from the venue while staying there", () => {
    expect(status(flagFarFromVenue(draft(), VENUE))).toEqual({
      "Sarapan di rest area KM 57": "verified", // before the first leg arrives
      "Makan siang di Bandar Djakarta": "verified",
      "Makan malam di Mangga Dua Square": "needs_review",
      "Playground umum": "verified",
      "Sarapan jauh": "needs_review",
      "Makan siang di Cikampek": "verified", // after the last leg leaves
      "Rumah makan di Majalengka": "verified", // not a venue day
    })
  })

  it("keeps flagged places and their pins", () => {
    const out = flagFarFromVenue(draft(), VENUE)
    const dinner = out.days[0].activities[2]
    expect(dinner.lat).not.toBeNull()
    expect(out.days[0].activities).toHaveLength(3)
  })

  it("does nothing without a venue", () => {
    const d = draft()
    expect(flagFarFromVenue(d, null)).toBe(d)
  })

  it("measures straight-line distance", () => {
    expect(distanceKm(VENUE, { lat: -6.1214, lng: 106.8455 })).toBe(0)
    expect(distanceKm(VENUE, { lat: -6.137, lng: 106.79 })).toBeGreaterThan(5)
  })
})
