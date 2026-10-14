import { describe, expect, it, vi } from "vitest"

import type { LocationProvider, PlaceQuery } from "@/features/location/provider"
import type { PlaceCandidate } from "@/features/location/placeMatching"
import { weightedJaccard } from "@/features/location/placeMatching"
import type { ActivityDraft, TripDraft } from "../types"
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
})
