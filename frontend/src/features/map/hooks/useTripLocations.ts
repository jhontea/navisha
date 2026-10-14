"use client"

import { useTripActivities } from "@/features/activity/hooks/useActivities"
import type {
  Activity,
  LocationPayload,
} from "@/features/activity/types"
import type { Day } from "@/features/trip/types"

export interface LocationPoint {
  activityId: string
  dayId: string
  dayNumber: number
  date: string
  title: string
  lat: number
  lng: number
  address: string
  orderIndex: number
  // Human-readable place name used to geocode accurate coordinates when
  // stored lat/lng are missing (e.g. AI-generated trips don't carry coords).
  locationName: string
  /** Pinned near the place but not confirmed (AI match to check). */
  approximate: boolean
}

export interface DayLocations {
  dayId: string
  dayNumber: number
  date: string
  points: LocationPoint[]
}

export interface TripLocationsResult {
  isLoading: boolean
  isError: boolean
  byDay: DayLocations[]
  flat: LocationPoint[]
  /** Places still waiting for a location (no coordinates yet). */
  unpinned: number
}

// Aggregates location-type activities across every day of the trip. A place
// marked needs_review is shown only when it has an approximate pin; one with
// no coordinates is counted as unpinned instead of being guessed on the map.
export function useTripLocations(tripId: string, days: Day[]): TripLocationsResult {
  const query = useTripActivities(tripId)

  const isLoading = query.isLoading
  const isError = query.isError

  let unpinned = 0
  const byDay: DayLocations[] = days.map((d) => {
    const items = query.data?.items_by_day[d.id] ?? []
    const points = items
      .filter((a: Activity) => a.type === "location" && a.payload)
      .filter((a: Activity) => {
        const p = a.payload as LocationPayload
        const pinned = p.lat != null && p.lng != null && !(p.lat === 0 && p.lng === 0)
        if (p.location_verification === "needs_review" && !pinned) {
          unpinned++
          return false
        }
        return true
      })
      .map((a: Activity): LocationPoint => {
        const p = a.payload as LocationPayload
        return {
          activityId: a.id,
          dayId: d.id,
          dayNumber: d.day_number,
          date: d.date,
          title: a.title,
          lat: p.lat ?? 0,
          lng: p.lng ?? 0,
          address: p.address ?? "",
          orderIndex: a.order_index,
          locationName: p.location_name ?? a.title,
          approximate: p.location_verification === "needs_review",
        }
      })
      // Keep a point if it has real coords OR a name we can geocode.
      .filter(
        (p) =>
          p.lat !== 0 ||
          p.lng !== 0 ||
          p.locationName.trim() !== "",
      )
      .sort((a, b) => a.orderIndex - b.orderIndex)
    return {
      dayId: d.id,
      dayNumber: d.day_number,
      date: d.date,
      points,
    }
  })

  return {
    isLoading,
    isError,
    byDay,
    flat: byDay.flatMap((g) => g.points),
    unpinned,
  }
}
