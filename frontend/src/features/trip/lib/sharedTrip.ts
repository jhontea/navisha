import { resolveTripCover } from "./cover"
import { formatTripRange } from "./home"
import { getTripDateMetrics, toLocalISODate } from "./status"
import type { PublicItinerary, PublicTripDay } from "../types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

export function sharedTripUrl(token: string): string {
  return `${API_BASE}/shared-trips/${encodeURIComponent(token)}`
}

/**
 * Server-side fetch of a shared trip for the share route. Returns null when
 * the API cannot be reached, so the page falls back to fetching on the client.
 * Not cached: a revoked or expired link must stop showing the trip at once.
 */
export async function fetchSharedTrip(
  token: string,
): Promise<{ status: "ready"; trip: PublicItinerary } | { status: "expired" | "missing" } | null> {
  try {
    const response = await fetch(sharedTripUrl(token), { cache: "no-store" })
    if (response.status === 410) return { status: "expired" }
    if (!response.ok) return { status: "missing" }
    return { status: "ready", trip: (await response.json()) as PublicItinerary }
  } catch {
    return null
  }
}

/** Link-preview text and image for a shared trip (Open Graph / Twitter). */
export function sharedTripPreview(trip: Pick<
  PublicItinerary,
  "title" | "description" | "start_date" | "end_date" | "cover_image_url"
>) {
  const { totalDays } = getTripDateMetrics(trip.start_date, trip.end_date)
  const parts = [formatTripRange(trip.start_date, trip.end_date), `${totalDays} ${totalDays === 1 ? "day" : "days"}`]
  if (trip.description) parts.push(trip.description)
  return {
    title: trip.title,
    description: `${parts.join(" · ")}. Day-by-day plan shared from Navisha.`,
    image: resolveTripCover(trip.cover_image_url, trip.description, 1200) || null,
  }
}

/**
 * The day a shared trip opens on: today's day while the trip is under way,
 * otherwise the first day.
 */
export function defaultOpenDayId(days: Pick<PublicTripDay, "id" | "date">[], today = new Date()): string | null {
  const iso = toLocalISODate(today)
  return (days.find((d) => d.date.slice(0, 10) === iso) ?? days[0])?.id ?? null
}

/** Short summary for a collapsed day header, e.g. "3 places · 1 note". */
export function dayContentSummary(day: Pick<PublicTripDay, "activities">): string {
  const places = day.activities.filter((a) => a.type !== "note").length
  const notes = day.activities.length - places
  const parts: string[] = []
  if (places) parts.push(`${places} ${places === 1 ? "place" : "places"}`)
  if (notes) parts.push(`${notes} ${notes === 1 ? "note" : "notes"}`)
  return parts.join(" · ")
}
