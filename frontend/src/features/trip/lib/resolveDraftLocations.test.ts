import { describe, expect, it, vi } from "vitest"

import type { LocationProvider, PlaceQuery } from "@/features/location/provider"
import type { PlaceCandidate } from "@/features/location/placeMatching"
import { weightedJaccard } from "@/features/location/placeMatching"
import type { ActivityDraft, LodgingDraft, TripDraft } from "../types"
import { resolveDraftLocations } from "./resolveDraftLocations"

function activity(title: string, location_name = title): ActivityDraft {
  return {
    type: "location",
    title,
    start_time: "",
    end_time: "",
    location_name,
    address: "",
    lat: null,
    lng: null,
    google_place_id: "",
    category: "budaya",
    notes: "",
  } as ActivityDraft
}

function draft(activities: ActivityDraft[]): TripDraft {
  return {
    title: "T",
    destination: "Kyoto, Japan",
    total_days: 1,
    travel_style: "",
    summary: "",
    base_currency: "JPY",
    budget: 0,
    tips: [],
    days: [{ day_number: 1, date: "2026-11-10", theme: "", activities }],
  }
}

const place = (name: string, description: string, externalId = name): PlaceCandidate => ({
  name,
  description,
  lat: 35,
  lng: 135.7,
  externalId,
})

function provider(local: (name: string) => PlaceCandidate[], global?: (name: string) => PlaceCandidate[]): LocationProvider {
  return {
    name: "geoapify",
    Boundary: ({ children }) => children,
    PlaceSearch: () => null,
    DestinationSearch: () => null,
    resolveDestination: async (d) => ({ description: d }),
    findPlaceCandidates: vi.fn(async (queries: PlaceQuery[]) => Object.fromEntries(queries.map((q) => [q.key, local(q.name)]))),
    findPlaceCandidatesGlobally: global
      ? vi.fn(async (queries: PlaceQuery[]) => Object.fromEntries(queries.map((q) => [q.key, global(q.name)])))
      : undefined,
  }
}

describe("weightedJaccard", () => {
  it("weights the distinctive part of a name over generic words", () => {
    expect(weightedJaccard("Kinkaku-ji Temple", "Kinkaku-ji")).toBeGreaterThan(0.8)
    expect(weightedJaccard("Nishiki Market", "Kuromon Market")).toBeLessThan(0.3)
    expect(weightedJaccard("", "Anything")).toBe(0)
  })
})

describe("resolveDraftLocations", () => {
  it("applies a close local match and marks it verified", async () => {
    const p = provider(() => [place("Kinkaku-ji", "Kinkakujicho, Kyoto, Japan", "abc")])
    const result = await resolveDraftLocations(draft([activity("Kinkaku-ji")]), "Kyoto, Japan", p)
    const act = result.days[0].activities[0]
    expect(act.location_verification).toBe("verified")
    expect(act.google_place_id).toBe("abc")
    expect(act.lat).toBe(35)
  })

  it("leaves a poor match for review without coordinates", async () => {
    const p = provider(() => [place("Kuromon Market", "Osaka, Japan")])
    const result = await resolveDraftLocations(draft([activity("Nishiki Market")]), "Kyoto, Japan", p)
    const act = result.days[0].activities[0]
    expect(act.location_verification).toBe("needs_review")
    expect(act.lat).toBeNull()
  })

  it("uses the global search only for unresolved places and only for near-exact names", async () => {
    const p = provider(
      () => [],
      (name) => (name === "Kansai International Airport" ? [place("Kansai International Airport", "Osaka, Japan", "kix")] : []),
    )
    const input = draft([activity("Kansai International Airport"), activity("Somewhere vague")])
    const result = await resolveDraftLocations(input, "Kyoto, Japan", p)
    expect(result.days[0].activities[0].google_place_id).toBe("kix")
    expect(result.days[0].activities[1].location_verification).toBe("needs_review")
    expect(p.findPlaceCandidatesGlobally).toHaveBeenCalledTimes(1)
  })

  it("fails open when the provider throws", async () => {
    const p = provider(() => {
      throw new Error("down")
    })
    const result = await resolveDraftLocations(draft([activity("Kinkaku-ji")]), "Kyoto, Japan", p)
    expect(result.days[0].activities[0].location_verification).toBe("needs_review")
  })

  it("does not mutate the input draft", async () => {
    const input = draft([activity("Kinkaku-ji")])
    await resolveDraftLocations(input, "Kyoto, Japan", provider(() => [place("Kinkaku-ji", "Kyoto, Japan")]))
    expect(input.days[0].activities[0].location_verification).toBeUndefined()
  })

  it("matches on the official place query or the display name, keeping the display name", async () => {
    const p = provider((name) => (name === "Senso-ji" ? [place("Sensō-ji", "Asakusa, Tokyo, Japan", "sj")] : []))
    const act = { ...activity("Kuil Senso-ji", "Kuil Senso-ji"), place_query: "Senso-ji", city: "Tokyo, Japan" }
    const result = await resolveDraftLocations(draft([act]), "Tokyo", p)
    const out = result.days[0].activities[0]
    expect(out.location_verification).toBe("verified")
    expect(out.location_name).toBe("Kuil Senso-ji")
    expect(out.address).toContain("Tokyo")
    const sent = (p.findPlaceCandidates as ReturnType<typeof vi.fn>).mock.calls[0][0][0]
    expect(sent).toMatchObject({ name: "Senso-ji", altName: "Kuil Senso-ji", city: "Tokyo, Japan" })
  })

  it("pins an approximate place found in the city, still asking for review", async () => {
    const p = provider(() => [
      { ...place("Medina", "Medina, Saudi Arabia", "city"), nearCity: true, resultType: "city" },
      { ...place("Prophet's Mosque", "Medina, Saudi Arabia", "pm"), nearCity: true, resultType: "amenity" },
    ])
    const act = { ...activity("Masjid Nabawi"), place_query: "Al-Masjid an-Nabawi", city: "Medina, Saudi Arabia" }
    const result = await resolveDraftLocations(draft([act]), "Umroh", p)
    const out = result.days[0].activities[0]
    expect(out.google_place_id).toBe("pm")
    expect(out.lat).toBe(35)
    expect(out.location_verification).toBe("needs_review")
  })

  it("does not pin on a whole-area result or a result outside the city search", async () => {
    const p = provider(() => [
      { ...place("Medina", "Medina, Saudi Arabia"), nearCity: true, resultType: "city" },
      { ...place("Somewhere", "Elsewhere"), resultType: "amenity" },
    ])
    const result = await resolveDraftLocations(draft([activity("Masjid Nabawi")]), "Umroh", p)
    expect(result.days[0].activities[0].lat).toBeNull()
  })

  it("looks long itineraries up in batches so one request never covers them all", async () => {
    const p = provider((name) => [place(name, "Kyoto, Japan")])
    const many = Array.from({ length: 60 }, (_, i) => activity(`Temple number ${i}`))
    const result = await resolveDraftLocations(draft(many), "Kyoto, Japan", p)
    expect(p.findPlaceCandidates).toHaveBeenCalledTimes(2)
    expect(result.days[0].activities.every((a) => a.location_verification === "verified")).toBe(true)
  })
})

function stay(name: string): LodgingDraft {
  return {
    name,
    location_name: name,
    place_query: name,
    city: "Kyoto, Japan",
    check_in_date: "2026-11-10",
    check_in_time: "15:00",
    check_out_date: "2026-11-11",
    check_out_time: "11:00",
    estimated_cost_per_night: 0,
    notes: "",
    address: "",
    lat: null,
    lng: null,
    google_place_id: "",
  }
}

describe("resolveDraftLocations lodging", () => {
  it("pins a hotel that matches by name", async () => {
    const p = provider(() => [place("Hotel Granvia Kyoto", "Shimogyo, Kyoto, Japan", "hotel-1")])
    const result = await resolveDraftLocations({ ...draft([]), lodging: [stay("Hotel Granvia Kyoto")] }, "Kyoto, Japan", p)
    expect(result.lodging?.[0]).toMatchObject({ lat: 35, lng: 135.7, google_place_id: "hotel-1", address: "Shimogyo, Kyoto, Japan" })
  })

  it("leaves a hotel without coordinates when only a rough match exists", async () => {
    const p = provider(() => [{ ...place("Kyoto Tower", "Shimogyo, Kyoto, Japan"), nearCity: true }])
    const input = { ...draft([]), lodging: [stay("Hotel Granvia Kyoto")] }
    const result = await resolveDraftLocations(input, "Kyoto, Japan", p)
    expect(result.lodging?.[0].lat).toBeNull()
    expect(input.lodging[0].lat).toBeNull() // the input draft is not mutated
  })
})
