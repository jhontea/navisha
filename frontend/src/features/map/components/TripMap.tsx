"use client"

import { Chip } from "@/components/Chip"
import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, ExternalLink, MapPin, Route, X } from "lucide-react"

import { IconButton } from "@/components/IconButton"
import { buttonVariants, Button } from "@/components/ui/button"
import { formatWeekdayDate } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { buildMapsDirectionsUrl, buildMapsPinUrl, hasValidCoords, MAX_WAYPOINTS } from "@/features/trip/lib/mapsUrl"
import type { Day } from "@/features/trip/types"
import { useTripLocations, type LocationPoint } from "../hooks/useTripLocations"
import { colorForDay } from "./mapColors"
import { MAP_ENABLED, MapCanvas } from "./MapCanvas"

/**
 * Map tab: the map with a floating day filter, and the places in order next
 * to it (below it on phones). Selecting a place highlights its pin and vice
 * versa; on phones the picked place also shows as a card over the map.
 */
export function TripMap({ tripId, days }: { tripId: string; days: Day[] }) {
  const { isLoading, isError, byDay, unpinned } = useTripLocations(tripId, days)
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

  if (!MAP_ENABLED) {
    return (
      <p className="rounded-2xl border-2 border-dashed bg-card/60 p-6 text-sm text-muted-foreground">
        The map is turned off for this deployment.
      </p>
    )
  }

  if (isLoading) return <div className="h-[60vh] animate-pulse rounded-xl bg-muted" aria-label="Loading map" />

  if (isError) {
    return (
      <p role="alert" className="rounded-2xl bg-destructive-bg p-6 text-center text-sm text-destructive">
        Couldn&apos;t load the places for this map. Reload the page to try again.
      </p>
    )
  }

  const daysWithPlaces = byDay.filter((d) => d.points.length > 0)
  const visibleByDay = activeDay === null ? daysWithPlaces : daysWithPlaces.filter((d) => d.dayId === activeDay)
  const visiblePoints = visibleByDay.flatMap((d) => d.points)
  const visiblePlaces = visiblePoints.filter((p) => p.kind === "place").length
  const directionsUrl =
    buildMapsDirectionsUrl(visiblePoints.filter((p) => hasValidCoords(p.lat, p.lng)).slice(0, MAX_WAYPOINTS)) ?? null

  if (daysWithPlaces.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-12 text-center">
        <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">No places on the map yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {unpinned > 0
            ? `${unpinned} ${unpinned === 1 ? "place in this trip couldn't" : "places in this trip couldn't"} be found on the map automatically. Open ${unpinned === 1 ? "it" : "them"} in the Itinerary to pick the exact spot.`
            : "Add a location to an activity in the Itinerary and it will show up here, in order, for each day."}
        </p>
      </div>
    )
  }

  const selectedPoint = visiblePoints.find((p) => p.activityId === selectedActivityId) ?? null
  const placeNumber = (p: LocationPoint) => {
    const day = visibleByDay.find((d) => d.dayId === p.dayId)
    if (!day || p.kind === "stay") return null
    return day.points.slice(0, day.points.indexOf(p) + 1).filter((x) => x.kind !== "stay").length
  }

  return (
    // One map element: first on phones, the wide right column from lg (order
    // swap, so the map is never mounted twice).
    <div className="grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="relative h-[62vh] min-h-80 overflow-hidden rounded-2xl border bg-card shadow-card lg:order-2 lg:h-auto">
        <MapCanvas
          visibleByDay={visibleByDay}
          selectedActivityId={selectedActivityId}
          onSelectActivity={handleSelect}
          onOpenInMaps={openPin}
        />

        {/* Day filter floats on the map (clear of the zoom controls on the right). */}
        <div
          role="group"
          aria-label="Show day"
          className="absolute left-3 right-14 top-3 z-10 flex gap-2 overflow-x-auto p-0.5 [scrollbar-width:none]"
        >
          <Chip pressed={activeDay === null} onClick={() => setActiveDay(null)} className="shadow-card">
            All days
          </Chip>
          {daysWithPlaces.map((d) => {
            const pressed = activeDay === d.dayId
            return (
              <Chip key={d.dayId} pressed={pressed} onClick={() => setActiveDay(pressed ? null : d.dayId)} className="shadow-card">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForDay(d.dayNumber) }} aria-hidden="true" />
                Day {d.dayNumber}
              </Chip>
            )
          })}
        </div>

        {/* Phones: the picked place as a card over the bottom of the map. */}
        {selectedPoint && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-overlay lg:hidden">
            <PointBadge point={selectedPoint} number={placeNumber(selectedPoint)} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold leading-snug text-foreground">{selectedPoint.title}</p>
              {selectedPoint.address && <p className="line-clamp-2 text-xs text-muted-foreground">{selectedPoint.address}</p>}
              <Button type="button" size="sm" variant="soft" className="mt-2" onClick={() => openPin(selectedPoint)}>
                <ExternalLink aria-hidden="true" />
                Open in Google Maps
              </Button>
            </div>
            <IconButton label="Close" icon={<X />} size="sm" className="-mr-1 -mt-1 shrink-0 text-muted-foreground" onClick={() => setSelectedActivityId(null)} />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card lg:order-1">
        {unpinned > 0 && (
          <p className="border-b bg-warning-bg px-4 py-2 text-xs text-foreground">
            {unpinned} {unpinned === 1 ? "place isn't" : "places aren't"} on the map yet. Open {unpinned === 1 ? "it" : "them"} in
            the Itinerary to pick the exact spot.
          </p>
        )}
        <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {visibleByDay.map((d) => (
            <li key={d.dayId}>
              <p className="sticky top-0 z-10 flex items-center gap-2 bg-card px-3 pb-1.5 pt-3 font-display text-base font-extrabold text-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForDay(d.dayNumber) }} aria-hidden="true" />
                Day {d.dayNumber}
                <span className="text-muted-foreground">· {formatWeekdayDate(d.date)}</span>
              </p>
              <ol className="space-y-1">
                {d.points.map((p) => (
                  <li
                    key={p.activityId}
                    ref={(el) => {
                      rowRefs.current.set(p.activityId, el)
                    }}
                    className={cn(
                      "flex items-start gap-1 rounded-xl px-1 transition-colors",
                      selectedActivityId === p.activityId ? "bg-primary-soft" : "hover:bg-muted",
                    )}
                  >
                    {/* eslint-disable-next-line no-restricted-syntax -- selectable place row synced with the map */}
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      aria-pressed={selectedActivityId === p.activityId}
                      className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <PointBadge point={p} number={placeNumber(p)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-foreground">{p.title}</span>
                        {p.address && <span className="line-clamp-1 text-xs text-muted-foreground">{p.address}</span>}
                        {p.approximate && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-warning" aria-hidden="true" />
                            Approximate pin, check it
                          </span>
                        )}
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
            {visiblePlaces} {visiblePlaces === 1 ? "place" : "places"} · {visibleByDay.length}{" "}
            {visibleByDay.length === 1 ? "day" : "days"}
          </p>
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "soft", size: "sm" })}>
              <Route aria-hidden="true" />
              Directions
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/** Numbered circle for a place (day colour) or an "H" square for a stay, matching the map pins. */
function PointBadge({ point, number }: { point: LocationPoint; number: number | null }) {
  if (point.kind === "stay") {
    return (
      <span
        className="bg-cover-fallback mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-on-cover"
        aria-hidden="true"
      >
        H
      </span>
    )
  }
  return (
    <span
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
      style={{ backgroundColor: colorForDay(point.dayNumber) }}
      aria-hidden="true"
    >
      {number}
    </span>
  )
}
