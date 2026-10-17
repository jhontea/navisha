import { describe, expect, it } from "vitest"

import type { ActivityDraft, TripDraft } from "../types"
import { budgetRows, curateDraft, draftKeys, legKey, nights, stayKey } from "./draftBookings"
import { suggestionKey } from "./suggestionKey"

const act = (title: string): ActivityDraft => ({
  type: "location",
  title,
  start_time: "11:00",
  end_time: "12:00",
  location_name: title,
  address: "",
  lat: null,
  lng: null,
  google_place_id: "",
  category: "kuliner",
  notes: "",
})

function draft(): TripDraft {
  return {
    title: "Ancol",
    destination: "Ancol, Jakarta",
    total_days: 2,
    travel_style: "",
    summary: "",
    base_currency: "IDR",
    budget: 2750000,
    tips: [],
    days: [
      { day_number: 1, date: "2026-11-07", theme: "", activities: [act("Bandar Djakarta"), act("Fan Meeting")] },
      { day_number: 2, date: "2026-11-08", theme: "", activities: [act("Eco Park")] },
    ],
    transport_legs: [
      {
        mode: "car", label: "Majalengka → Ancol", from_location: "Majalengka", to_location: "Ancol",
        departure_date: "2026-11-07", departure_time: "04:00", arrival_date: "2026-11-07", arrival_time: "08:00",
        estimated_cost: 440000, notes: "",
      },
      {
        mode: "car", label: "Ancol → Majalengka", from_location: "Ancol", to_location: "Majalengka",
        departure_date: "2026-11-08", departure_time: "13:00", arrival_date: "2026-11-08", arrival_time: "17:00",
        estimated_cost: 440000, notes: "",
      },
    ],
    lodging: [
      {
        name: "Mercure Ancol", location_name: "Mercure Ancol", place_query: "Mercure Convention Center Ancol",
        city: "North Jakarta", check_in_date: "2026-11-07", check_in_time: "18:00", check_out_date: "2026-11-08",
        check_out_time: "12:00", estimated_cost_per_night: 950000, notes: "", address: "", lat: null, lng: null,
        google_place_id: "",
      },
    ],
    budget_breakdown: { transport: 880000, accommodation: 950000, food: 650000, activity: 270000, other: 0 },
  }
}

describe("draftKeys", () => {
  it("lists activities, legs and stays", () => {
    expect(draftKeys(draft())).toEqual([
      suggestionKey(act("Bandar Djakarta")),
      suggestionKey(act("Fan Meeting")),
      suggestionKey(act("Eco Park")),
      "leg:0",
      "leg:1",
      "stay:0",
    ])
  })

  it("handles drafts made before bookings existed", () => {
    const old = { ...draft(), transport_legs: undefined, lodging: undefined }
    expect(draftKeys(old)).toHaveLength(3)
    expect(curateDraft(old, new Set()).transport_legs).toEqual([])
  })
})

describe("curateDraft", () => {
  it("keeps only the selected activities, legs and stays", () => {
    const d = draft()
    const selected = new Set([suggestionKey(act("Fan Meeting")), legKey(1)])
    const out = curateDraft(d, selected)
    expect(out.days.map((day) => day.activities.map((a) => a.title))).toEqual([["Fan Meeting"], []])
    expect(out.transport_legs?.map((l) => l.label)).toEqual(["Ancol → Majalengka"])
    expect(out.lodging).toEqual([])
    expect(out.budget_breakdown).toEqual(d.budget_breakdown)
    expect(d.transport_legs).toHaveLength(2) // input untouched
  })

  it("keeps a selected stay", () => {
    expect(curateDraft(draft(), new Set([stayKey(0)])).lodging?.[0].name).toBe("Mercure Ancol")
  })
})

describe("budgetRows", () => {
  it("lists non-zero categories in order", () => {
    expect(budgetRows(draft().budget_breakdown)).toEqual([
      { label: "Transport", amount: 880000 },
      { label: "Stay", amount: 950000 },
      { label: "Food", amount: 650000 },
      { label: "Activities", amount: 270000 },
    ])
    expect(budgetRows(undefined)).toEqual([])
  })
})

describe("nights", () => {
  it("counts nights between dates", () => {
    expect(nights("2026-11-07", "2026-11-08")).toBe(1)
    expect(nights("2026-11-07", "2026-11-10")).toBe(3)
    expect(nights("2026-11-08", "2026-11-08")).toBe(0)
  })
})
