import type { Activity, LocationPayload, NotePayload } from "@/features/activity/types"
import { extractDate, extractTime } from "@/features/activity/lib/timeline"
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  type Accommodation,
} from "@/features/accommodation/types"
import type { Transportation } from "@/features/transportation/types"
import type { TripDetail } from "../types"

/**
 * Builds an iCalendar (RFC 5545) file for a trip. Times are "floating"
 * (no Z, no TZID): Navisha stores wall-clock times at the destination, so
 * calendar apps show them exactly as planned.
 */

interface TripIcsInput {
  trip: Pick<TripDetail, "title" | "days">
  activitiesByDay: Record<string, Activity[]>
  transports: Transportation[]
  stays: Accommodation[]
  now?: Date
}

interface IcsEvent {
  uid: string
  start: string // YYYYMMDDTHHMMSS, floating
  end: string
  summary: string
  location?: string
  description?: string
}

/** "2027-02-27" + "19:00" (+ hours) → "20270227T190000", computed on the digits with no timezone. */
function stamp(date: string, time: string, addHours = 0): string {
  const [y, mo, d] = date.split("-").map(Number)
  const [h, mi] = time.split(":").map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d, h + addHours, mi))
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`
}

const clock = (value: string | null | undefined) => value?.match(/^(\d{2}):(\d{2})/)?.[0] ?? null

export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n")
}

/** Folds a content line at 75 octets without splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ""
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // Continuation lines start with a space, which counts toward the 75.
    if (size + bytes > 75) {
      parts.push(current)
      current = " "
      size = 1
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join("\r\n")
}

function activityEvents(trip: TripIcsInput["trip"], activitiesByDay: TripIcsInput["activitiesByDay"]): IcsEvent[] {
  const events: IcsEvent[] = []
  for (const day of trip.days ?? []) {
    for (const activity of activitiesByDay[day.id] ?? []) {
      const startTime = clock(activity.start_time)
      if (activity.type === "todo" || !startTime) continue
      const endTime = clock(activity.end_time)
      const start = stamp(day.date, startTime)
      let end = endTime ? stamp(day.date, endTime) : stamp(day.date, startTime, 1)
      if (end === start) end = stamp(day.date, startTime, 1)
      else if (end < start) end = stamp(day.date, endTime ?? startTime, 24)

      const event: IcsEvent = { uid: `activity-${activity.id}@navisha`, start, end, summary: activity.title }
      if (activity.type === "location") {
        const payload = activity.payload as LocationPayload | null
        event.location = payload?.location_name || payload?.address || undefined
        event.description = payload?.notes || undefined
      } else {
        event.description = (activity.payload as NotePayload | null)?.content || undefined
      }
      events.push(event)
    }
  }
  return events
}

function transportEvents(transports: Transportation[]): IcsEvent[] {
  return transports.flatMap((t) => {
    const depDate = extractDate(t.departure_datetime)
    const depTime = extractTime(t.departure_datetime)
    if (!depDate || !depTime) return []
    const arrDate = extractDate(t.arrival_datetime)
    const arrTime = extractTime(t.arrival_datetime)
    const start = stamp(depDate, depTime)
    const arrival = arrDate && arrTime ? stamp(arrDate, arrTime) : null
    const name = t.label || t.type.charAt(0).toUpperCase() + t.type.slice(1)
    const route = [t.from_location, t.to_location].filter(Boolean).join(" → ")
    return [{
      uid: `transport-${t.id}@navisha`,
      start,
      end: arrival && arrival > start ? arrival : stamp(depDate, depTime, 1),
      summary: route ? `${name}: ${route}` : name,
      location: t.from_location || undefined,
      description: t.reference_number ? `Booking ref: ${t.reference_number}` : undefined,
    }]
  })
}

function stayEvents(stays: Accommodation[]): IcsEvent[] {
  return stays.flatMap((s) => {
    const shared = {
      location: s.location_name || undefined,
      description: s.confirmation_number ? `Confirmation: ${s.confirmation_number}` : undefined,
    }
    const events: IcsEvent[] = []
    if (s.check_in) {
      const time = clock(s.check_in_time) ?? DEFAULT_CHECK_IN_TIME
      events.push({ uid: `stay-in-${s.id}@navisha`, start: stamp(s.check_in, time), end: stamp(s.check_in, time, 1), summary: `Check-in: ${s.name}`, ...shared })
    }
    if (s.check_out) {
      const time = clock(s.check_out_time) ?? DEFAULT_CHECK_OUT_TIME
      events.push({ uid: `stay-out-${s.id}@navisha`, start: stamp(s.check_out, time), end: stamp(s.check_out, time, 1), summary: `Check-out: ${s.name}`, ...shared })
    }
    return events
  })
}

/** Returns the .ics text and how many events it holds (0 means nothing timed to add). */
export function buildTripIcs({ trip, activitiesByDay, transports, stays, now = new Date() }: TripIcsInput) {
  const events = [...activityEvents(trip, activitiesByDay), ...transportEvents(transports), ...stayEvents(stays)]
  const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Navisha//Trip itinerary//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(trip.title)}`,
  ]
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${dtstamp}`, `DTSTART:${e.start}`, `DTEND:${e.end}`, `SUMMARY:${escapeText(e.summary)}`)
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return { text: lines.map(foldLine).join("\r\n") + "\r\n", count: events.length }
}

/** Safe download name: illegal filename characters replaced, "trip.ics" when nothing is left. */
export function icsFileName(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").trim().replace(/^\.+|\.+$/g, "")
  return `${safe || "trip"}.ics`
}
