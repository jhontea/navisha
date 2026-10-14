"use client"

import { useCallback, useMemo } from "react"

import { MapCanvas } from "@/features/map/components/MapCanvas"
import type { DayLocations, LocationPoint } from "@/features/map/hooks/useTripLocations"
import { buildMapsPinUrl, hasValidCoords } from "../lib/mapsUrl"
import type { PublicTripDay } from "../types"

/** Map for a shared trip: one day (`dayId`) or every day when `dayId` is null. */
export function SharedTripMap({
  days,
  dayId = null,
  selectedActivityId,
  onSelectActivity,
}: {
  days: PublicTripDay[]
  dayId?: string | null
  selectedActivityId?: string | null
  onSelectActivity?: (activityId: string) => void
}) {
  const visibleByDay = useMemo<DayLocations[]>(
    () =>
      days
        .filter((day) => dayId === null || day.id === dayId)
        .map((day) => ({
          dayId: day.id,
          dayNumber: day.day_number,
          date: day.date,
          points: day.activities
            // Activities without coordinates have no place on the map.
            .filter((activity) => hasValidCoords(activity.payload.lat, activity.payload.lng))
            .map((activity, index): LocationPoint => ({
              activityId: activity.id,
              dayId: day.id,
              dayNumber: day.day_number,
              date: day.date,
              title: activity.title,
              lat: activity.payload.lat!,
              lng: activity.payload.lng!,
              address: activity.payload.address ?? "",
              orderIndex: index,
              locationName: activity.payload.location_name ?? activity.title,
              approximate: false,
            })),
        })),
    [days, dayId],
  )

  const openInMaps = useCallback((point: LocationPoint) => {
    window.open(buildMapsPinUrl(point.lat, point.lng, point.locationName), "_blank", "noopener,noreferrer")
  }, [])
  const handleSelect = useCallback(
    (point: LocationPoint) => onSelectActivity?.(point.activityId),
    [onSelectActivity],
  )

  return (
    <MapCanvas
      visibleByDay={visibleByDay}
      onOpenInMaps={openInMaps}
      selectedActivityId={selectedActivityId}
      onSelectActivity={onSelectActivity ? handleSelect : undefined}
    />
  )
}
