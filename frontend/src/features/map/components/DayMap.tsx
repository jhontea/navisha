"use client"

import { useCallback } from "react"
import { MapPin } from "lucide-react"

import { buildMapsPinUrl, hasValidCoords } from "@/features/trip/lib/mapsUrl"
import type { Day } from "@/features/trip/types"
import { useTripLocations, type LocationPoint } from "../hooks/useTripLocations"
import { MAP_ENABLED, MapCanvas } from "./MapCanvas"

const mapLoading = () => <div className="h-full animate-pulse bg-muted" aria-hidden="true" />

/**
 * Map of a single day's places, used beside the itinerary on desktop.
 * Markers follow the day's activity order; selection is shared with the
 * timeline (click a card to fly to its marker, click a marker to highlight
 * the card).
 */
export function DayMap({
  tripId,
  days,
  dayId,
  selectedActivityId,
  onSelectActivity,
}: {
  tripId: string
  days: Day[]
  dayId: string | null
  selectedActivityId: string | null
  onSelectActivity: (activityId: string) => void
}) {
  const { isLoading, isError, byDay } = useTripLocations(tripId, days)
  const day = days.find((d) => d.id === dayId) ?? null
  const visibleByDay = byDay.filter((d) => d.dayId === dayId)
  const visiblePoints = visibleByDay.flatMap((d) => d.points)

  const handleSelect = useCallback((p: LocationPoint) => onSelectActivity(p.activityId), [onSelectActivity])
  const openInMaps = useCallback((p: LocationPoint) => {
    const url = hasValidCoords(p.lat, p.lng) ? buildMapsPinUrl(p.lat, p.lng, p.title) : "https://www.google.com/maps/"
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  if (!MAP_ENABLED) return null

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">
          {day ? `Day ${day.day_number} map` : "Map"}
        </p>
        {visiblePoints.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {visiblePoints.length} {visiblePoints.length === 1 ? "place" : "places"}
          </p>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          mapLoading()
        ) : isError ? (
          <p className="p-4 text-sm text-destructive">Couldn&apos;t load the map.</p>
        ) : visiblePoints.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {day ? `No places with a location on Day ${day.day_number} yet.` : "Open a day to see it on the map."}
            </p>
          </div>
        ) : (
          <MapCanvas
            visibleByDay={visibleByDay}
            onOpenInMaps={openInMaps}
            selectedActivityId={selectedActivityId}
            onSelectActivity={handleSelect}
          />
        )}
      </div>
    </div>
  )
}
