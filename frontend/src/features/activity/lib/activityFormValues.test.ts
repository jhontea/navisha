import { describe, expect, it } from "vitest"

import type { Activity } from "../types"
import {
  activityFormDefaults,
  activityFormSchema,
  activityPayload,
  parseCoord,
  type ActivityFormValues,
} from "./activityFormValues"

const activity = (over: Partial<Activity>): Activity => ({
  id: "a1",
  day_id: "d1",
  type: "location",
  title: "Fushimi Inari",
  start_time: "08:00",
  end_time: "10:00",
  order_index: 0,
  payload: null,
  created_at: "",
  updated_at: "",
  ...over,
})

describe("parseCoord", () => {
  it("accepts commas and trailing text", () => {
    expect(parseCoord("34,9671")).toBe(34.9671)
    expect(parseCoord("-8.65 S")).toBe(-8.65)
    expect(parseCoord("")).toBeNaN()
    expect(parseCoord("north")).toBeNaN()
  })
})

describe("activityFormDefaults / activityPayload", () => {
  it("round-trips a location", () => {
    const initial = activity({
      payload: {
        location_name: "Fushimi Inari Taisha",
        lat: 34.9671,
        lng: 135.7727,
        address: "Kyoto",
        google_place_id: "p1",
        notes: "Go early",
        external_url: "https://inari.jp/",
      },
    } as Partial<Activity>)
    const payload = activityPayload(activityFormDefaults(initial))
    expect(payload).toMatchObject({
      location_name: "Fushimi Inari Taisha",
      lat: 34.9671,
      lng: 135.7727,
      address: "Kyoto",
      notes: "Go early",
      external_url: "https://inari.jp/",
      location_verification: "verified",
      location_confidence: 100,
    })
  })

  it("marks a location without coordinates for review", () => {
    const v: ActivityFormValues = { ...activityFormDefaults(), title: "Cafe", location_name: "Cafe" }
    expect(activityPayload(v)).toMatchObject({ lat: null, lng: null, location_verification: "needs_review", location_confidence: null })
  })

  it("round-trips notes and todos", () => {
    const note = activity({ type: "note", payload: { content: "Bring cash" } } as Partial<Activity>)
    expect(activityPayload(activityFormDefaults(note))).toEqual({ content: "Bring cash" })
    const items = [{ id: "1", text: "Passport", completed: false }]
    const todo = activity({ type: "todo", payload: { items } } as Partial<Activity>)
    expect(activityPayload(activityFormDefaults(todo))).toEqual({ items })
  })
})

describe("activityFormSchema", () => {
  const base = activityFormDefaults()
  const issues = (v: ActivityFormValues) => {
    const r = activityFormSchema.safeParse(v)
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."))
  }

  it("requires what each type needs", () => {
    expect(issues({ ...base, title: "x" })).toEqual(["location_name"])
    expect(issues({ ...base, type: "note", title: "x" })).toEqual(["note_content"])
    expect(issues({ ...base, type: "todo", title: "x" })).toEqual(["todo_items"])
  })

  it("rejects an end time before the start", () => {
    expect(issues({ ...base, title: "x", location_name: "y", start_time: "10:00", end_time: "09:00" })).toEqual(["end_time"])
  })
})
