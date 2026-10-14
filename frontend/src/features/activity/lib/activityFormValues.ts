import { z } from "zod"

import type { Activity, LocationPayload, NotePayload, TodoPayload } from "../types"
import { normalizeExternalUrl } from "./externalUrl"
import { getDurationMinutes } from "./time"

/** Form state of ActivityForm and its conversion to and from the API shape. */

export const ACTIVITY_TYPES = ["location", "note", "todo"] as const

/** Lenient coordinate parse: accepts "1,5" and trailing text ("-8.65 S"). */
export function parseCoord(s: string): number {
  if (!s) return NaN
  const cleaned = s.replace(",", ".").trim()
  const match = cleaned.match(/^-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : NaN
}

export const activityFormSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    title: z.string().min(1, "Title is required").max(120),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    // location
    location_name: z.string().optional(),
    lat: z
      .string()
      .optional()
      .refine((v) => !v || Number.isFinite(parseCoord(v)), "Invalid latitude"),
    lng: z
      .string()
      .optional()
      .refine((v) => !v || Number.isFinite(parseCoord(v)), "Invalid longitude"),
    address: z.string().optional(),
    google_place_id: z.string().optional(),
    location_notes: z.string().optional(),
    external_url: z
      .string()
      .optional()
      .refine(
        (value) => !value?.trim() || normalizeExternalUrl(value) !== null,
        "Enter a valid website address",
      ),
    // note
    note_content: z.string().optional(),
    // todo
    todo_items: z
      .array(z.object({ id: z.string(), text: z.string(), completed: z.boolean() }))
      .optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type === "location" && d.start_time && d.end_time) {
      if (getDurationMinutes(d.start_time, d.end_time) === null) {
        ctx.addIssue({ code: "custom", message: "End time must be later than start time", path: ["end_time"] })
      }
    }
    if (d.type === "location" && !d.location_name?.trim()) {
      ctx.addIssue({ code: "custom", message: "Location name is required", path: ["location_name"] })
    }
    if (d.type === "note" && !d.note_content?.trim()) {
      ctx.addIssue({ code: "custom", message: "Content is required", path: ["note_content"] })
    }
    if (d.type === "todo" && (!d.todo_items || d.todo_items.length === 0)) {
      ctx.addIssue({ code: "custom", message: "Add at least one todo item", path: ["todo_items"] })
    }
  })

export type ActivityFormValues = z.infer<typeof activityFormSchema>

const EMPTY: ActivityFormValues = {
  type: "location",
  title: "",
  start_time: "",
  end_time: "",
  location_name: "",
  lat: "",
  lng: "",
  address: "",
  google_place_id: "",
  location_notes: "",
  external_url: "",
  note_content: "",
  todo_items: [],
}

/** Form values for a new activity, or for editing `initial`. */
export function activityFormDefaults(initial?: Activity): ActivityFormValues {
  if (!initial) return { ...EMPTY, todo_items: [] }
  const base: ActivityFormValues = {
    ...EMPTY,
    todo_items: [],
    type: initial.type,
    title: initial.title,
    start_time: initial.start_time ?? "",
    end_time: initial.end_time ?? "",
  }
  if (!initial.payload) return base
  switch (initial.type) {
    case "location": {
      const p = initial.payload as LocationPayload
      return {
        ...base,
        location_name: p.location_name ?? "",
        lat: p.lat?.toString() ?? "",
        lng: p.lng?.toString() ?? "",
        address: p.address ?? "",
        google_place_id: p.google_place_id ?? "",
        location_notes: p.notes ?? "",
        external_url: p.external_url ?? "",
      }
    }
    case "note":
      return { ...base, note_content: (initial.payload as NotePayload).content ?? "" }
    case "todo":
      return { ...base, todo_items: (initial.payload as TodoPayload).items ?? [] }
  }
}

/** The API payload for the form's activity type. */
export function activityPayload(v: ActivityFormValues) {
  switch (v.type) {
    case "location": {
      const parsedLat = v.lat ? parseCoord(v.lat) : NaN
      const parsedLng = v.lng ? parseCoord(v.lng) : NaN
      const lat = Number.isFinite(parsedLat) ? parsedLat : null
      const lng = Number.isFinite(parsedLng) ? parsedLng : null
      const isVerified = lat !== null && lng !== null
      return {
        location_name: v.location_name ?? "",
        lat,
        lng,
        google_place_id: v.google_place_id ?? "",
        address: v.address ?? "",
        notes: v.location_notes ?? "",
        location_verification: isVerified ? ("verified" as const) : ("needs_review" as const),
        location_confidence: isVerified ? 100 : null,
        external_url: normalizeExternalUrl(v.external_url ?? "") ?? "",
        image_urls: [],
      }
    }
    case "note":
      return { content: v.note_content ?? "" }
    case "todo":
      return { items: v.todo_items ?? [] }
  }
}
