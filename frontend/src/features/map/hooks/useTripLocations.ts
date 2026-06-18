"use client"

import { useQueries } from "@tanstack/react-query"
import { activityApi } from "@/features/activity/api"
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
}

// Aggregates location-type activities across every day of the trip via
// parallel queries. Lat/lng=0 rows are excluded — they came in without
// real coords and would skew the map center.
export function useTripLocations(days: Day[]): TripLocationsResult {
  const queries = useQueries({
    queries: days.map((d) => ({
      queryKey: ["activities", "list", d.id] as const,
      queryFn: () => activityApi.list(d.id),
      enabled: !!d.id,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)

  const byDay: DayLocations[] = days.map((d, i) => {
    const items = queries[i]?.data?.items ?? []
    const points = items
      .filter((a: Activity) => a.type === "location" && a.payload)
      .map((a: Activity) => {
        const p = a.payload as LocationPayload
        return {
          activityId: a.id,
          dayId: d.id,
          dayNumber: d.day_number,
          date: d.date,
          title: a.title,
          lat: p.lat,
          lng: p.lng,
          address: p.address ?? "",
          orderIndex: a.order_index,
        }
      })
      .filter((p) => p.lat !== 0 || p.lng !== 0)
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
  }
}
