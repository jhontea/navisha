"use client"

import { Chip } from "@/components/Chip"
import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ExternalLink, MapPin, Route } from "lucide-react"

import { buttonVariants, Button } from "@/components/ui/button"
import { formatWeekdayDate } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { MAP_PROVIDER } from "@/features/location/config"
import { buildMapsDirectionsUrl, buildMapsPinUrl, hasValidCoords, MAX_WAYPOINTS } from "@/features/trip/lib/mapsUrl"
import type { Day } from "@/features/trip/types"
import { useTripLocations, type LocationPoint } from "../hooks/useTripLocations"
import { colorForDay } from "./mapColors"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const mapLoading = () => <div className="h-full animate-pulse bg-muted" aria-hidden="true" />
const GoogleMapCanvas = dynamic(() => import("./GoogleMapCanvas").then((m) => m.GoogleMapCanvas), {
  ssr: false,
  loading: mapLoading,
})
const MapLibreCanvas = dynamic(() => import("./MapLibreCanvas").then((m) => m.MapLibreCanvas), {
  ssr: false,
  loading: mapLoading,
})

/**
 * Map tab: pick a day (or all), see its places in order next to the map.
 * Selecting a place highlights its marker and vice versa.
 */
export function TripMap({ tripId, days }: { tripId: string; days: Day[] }) {
  const { isLoading, isError, byDay } = useTripLocations(tripId, days)
  const [activeDay, setActiveDay] = useState<string | null>(null) // null = all days
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLLIElement | null>>(new Map())

  useEffect(() => {
    if (selectedActivityId) rowRefs.current.get(selectedActivityId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedActivityId])

  const handleSelect = useCallback((p: LocationPoint) => setSelectedActivityId(p.activityId), [])
  const openPin = useCallback((p: LocationPoint) => {
    const url = hasValidCoords(p.lat, p.lng) ? buildMapsPinUrl(p.lat, p.lng, p.title) : "https://www.google.com/maps/"
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  if (MAP_PROVIDER === "disabled" || (MAP_PROVIDER === "google" && !API_KEY)) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        The map is turned off for this deployment.
      </p>
    )
  }

  if (isLoading) return <div className="h-[60vh] animate-pulse rounded-xl bg-muted" aria-label="Loading map" />

  if (isError) {
    return (
      <p role="alert" className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
        Couldn&apos;t load the places for this map. Reload the page to try again.
      </p>
    )
  }

  const daysWithPlaces = byDay.filter((d) => d.points.length > 0)
  const visibleByDay = activeDay === null ? daysWithPlaces : daysWithPlaces.filter((d) => d.dayId === activeDay)
  const visiblePoints = visibleByDay.flatMap((d) => d.points)
  const directionsUrl =
    buildMapsDirectionsUrl(visiblePoints.filter((p) => hasValidCoords(p.lat, p.lng)).slice(0, MAX_WAYPOINTS)) ?? null

  if (daysWithPlaces.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
        <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">No places on the map yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add a location to an activity in the Itinerary and it will show up here, in order, for each day.
        </p>
      </div>
    )
  }

  return (
    // One map element: below the day picker on phones, a full-height column on
    // the right from lg (grid placement, so the map is never mounted twice).
    <div className="grid gap-3 lg:h-[calc(100vh-10rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-4">
      <div role="group" aria-label="Show day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:col-start-1 lg:row-start-1">
        <Chip pressed={activeDay === null} onClick={() => setActiveDay(null)}>
          All days
        </Chip>
        {daysWithPlaces.map((d) => {
          const pressed = activeDay === d.dayId
          return (
            <Chip key={d.dayId} pressed={pressed} onClick={() => setActiveDay(pressed ? null : d.dayId)}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForDay(d.dayNumber) }} aria-hidden="true" />
              Day {d.dayNumber}
            </Chip>
          )
        })}
      </div>

      <div className="relative h-[55vh] min-h-72 overflow-hidden rounded-xl border bg-card lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-auto">
        <Canvas
          visibleByDay={visibleByDay}
          visiblePoints={visiblePoints}
          selectedActivityId={selectedActivityId}
          onSelect={handleSelect}
          onOpenPin={openPin}
        />
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card lg:col-start-1 lg:row-start-2">
        <ol className="min-h-0 flex-1 divide-y overflow-y-auto">
          {visibleByDay.map((d) => (
            <li key={d.dayId}>
              <p className="sticky top-0 z-10 flex items-center gap-2 bg-card px-4 py-2 text-sm font-semibold text-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForDay(d.dayNumber) }} aria-hidden="true" />
                Day {d.dayNumber}
                <span className="font-normal text-muted-foreground">· {formatWeekdayDate(d.date)}</span>
              </p>
              <ol className="pb-2">
                {d.points.map((p, i) => (
                  <li
                    key={p.activityId}
                    ref={(el) => {
                      rowRefs.current.set(p.activityId, el)
                    }}
                    className={cn("flex items-start gap-1 px-2", selectedActivityId === p.activityId && "bg-primary/5")}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      aria-pressed={selectedActivityId === p.activityId}
                      className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: colorForDay(p.dayNumber) }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{p.title}</span>
                        {p.address && <span className="line-clamp-1 text-xs text-muted-foreground">{p.address}</span>}
                      </span>
                    </button>
                    <Button
                      type="button"
                      onClick={() => openPin(p)}
                      aria-label={`Open ${p.title} in Google Maps`}
                      variant="ghost" size="icon-sm" className="mt-1 shrink-0 text-muted-foreground"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            {visiblePoints.length} {visiblePoints.length === 1 ? "place" : "places"} · {visibleByDay.length}{" "}
            {visibleByDay.length === 1 ? "day" : "days"}
          </p>
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Route aria-hidden="true" />
              Directions
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Canvas({
  visibleByDay,
  visiblePoints,
  selectedActivityId,
  onSelect,
  onOpenPin,
}: {
  visibleByDay: ReturnType<typeof useTripLocations>["byDay"]
  visiblePoints: LocationPoint[]
  selectedActivityId: string | null
  onSelect: (p: LocationPoint) => void
  onOpenPin: (p: LocationPoint) => void
}) {
  return MAP_PROVIDER === "google" ? (
    <GoogleMapCanvas
      visiblePoints={visiblePoints}
      visibleByDay={visibleByDay}
      onOpenInMaps={onOpenPin}
      selectedActivityId={selectedActivityId}
      onSelectActivity={onSelect}
    />
  ) : (
    <MapLibreCanvas
      visibleByDay={visibleByDay}
      onOpenInMaps={onOpenPin}
      selectedActivityId={selectedActivityId}
      onSelectActivity={onSelect}
    />
  )
}
