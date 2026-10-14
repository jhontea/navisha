"use client"

import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import { useTripActivities } from "@/features/activity/hooks/useActivities"
import type { LocationPayload } from "@/features/activity/types"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import type { Day } from "@/features/trip/types"

import { dayRoute } from "../lib/dayRoute"

export interface LocationPoint {
  /** Activity id, or "stay:<id>:<event>" for a hotel stop. */
  activityId: string
  /** A place you visit (numbered) or the hotel ("H", not numbered). */
  kind: "place" | "stay"
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

const STAY_LABEL = { night: "Hotel", check_in: "Check-in", check_out: "Check-out" } as const

const pinned = (lat: number | null | undefined, lng: number | null | undefined) =>
  lat != null && lng != null && !(lat === 0 && lng === 0)

// Each day's places in itinerary order, with the hotel where the day starts
// or where you check in/out, so the route follows the day (airport, hotel,
// then the evening's place). A place marked needs_review is shown only when
// it has an approximate pin; one with no coordinates is counted as unpinned
// instead of being guessed on the map.
export function useTripLocations(tripId: string, days: Day[]): TripLocationsResult {
  const query = useTripActivities(tripId)
  const transportations = useTransportations(tripId).data?.items ?? []
  const stays = useAccommodations(tripId).data?.items ?? []

  let unpinned = 0
  const byDay: DayLocations[] = days.map((d) => {
    const activities = query.data?.items_by_day[d.id] ?? []
    const points: LocationPoint[] = []
    const base = { dayId: d.id, dayNumber: d.day_number, date: d.date }
    for (const stop of dayRoute(activities, transportations, stays, d.date)) {
      if (stop.kind === "stay") {
        const s = stop.stay
        if (!pinned(s.lat, s.lng)) continue
        points.push({
          ...base,
          activityId: `stay:${s.id}:${stop.event}`,
          kind: "stay",
          title: `${STAY_LABEL[stop.event]} · ${s.name}`,
          lat: s.lat!,
          lng: s.lng!,
          address: s.location_name ?? "",
          orderIndex: points.length,
          locationName: s.name,
          approximate: false,
        })
        continue
      }
      const a = stop.activity
      if (a.type !== "location" || !a.payload) continue
      const p = a.payload as LocationPayload
      if (!pinned(p.lat, p.lng)) {
        if (p.location_verification === "needs_review") {
          unpinned++
          continue
        }
        if (!p.location_name?.trim()) continue // nothing to pin or geocode
      }
      points.push({
        ...base,
        activityId: a.id,
        kind: "place",
        title: a.title,
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
        address: p.address ?? "",
        orderIndex: points.length,
        locationName: p.location_name ?? a.title,
        approximate: p.location_verification === "needs_review",
      })
    }
    return { ...base, points }
  })

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    byDay,
    flat: byDay.flatMap((g) => g.points),
    unpinned,
  }
}
