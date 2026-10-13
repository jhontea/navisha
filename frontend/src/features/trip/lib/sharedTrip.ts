import { resolveTripCover } from "./cover"
import { formatTripRange } from "./home"
import { getTripDateMetrics } from "./status"
import type { PublicItinerary } from "../types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

export function sharedTripUrl(token: string): string {
  return `${API_BASE}/shared-trips/${encodeURIComponent(token)}`
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
