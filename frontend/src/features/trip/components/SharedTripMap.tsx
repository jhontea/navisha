"use client"

import { useCallback, useMemo } from "react"
import { MapLibreCanvas } from "@/features/map/components/MapLibreCanvas"
import type { DayLocations, LocationPoint } from "@/features/map/hooks/useTripLocations"
import type { PublicTripDay } from "../types"

export function SharedTripMap({ days }: { days: PublicTripDay[] }) {
  const visibleByDay = useMemo<DayLocations[]>(() => days.map((day) => ({
    dayId: day.id,
    dayNumber: day.day_number,
    date: day.date,
    points: day.activities.map((activity, index): LocationPoint => ({
      activityId: activity.id,
      dayId: day.id,
      dayNumber: day.day_number,
      date: day.date,
      title: activity.title,
      lat: activity.payload.lat ?? 0,
      lng: activity.payload.lng ?? 0,
      address: activity.payload.address ?? "",
      orderIndex: index,
      locationName: activity.payload.location_name ?? activity.title,
    })),
  })), [days])

  const openInMaps = useCallback((point: LocationPoint) => {
    const query = point.lat && point.lng ? `${point.lat},${point.lng}` : point.locationName
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer")
  }, [])

  return <MapLibreCanvas visibleByDay={visibleByDay} onOpenInMaps={openInMaps} />
}
