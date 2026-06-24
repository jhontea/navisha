"use client"

import { useEffect, useMemo, useState } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildMapsDirectionsUrl, hasValidCoords, MAX_WAYPOINTS } from "@/features/trip/lib/mapsUrl"
import type { Day } from "@/features/trip/types"
import {
  useTripLocations,
  type LocationPoint,
} from "../hooks/useTripLocations"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
const MAP_ID = "cc475d9a8bf16e26f8975c02"

const DAY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]
const colorForDay = (n: number) => DAY_COLORS[(n - 1) % DAY_COLORS.length]

interface Props {
  days: Day[]
}

export function TripMap({ days }: Props) {
  const { isLoading, isError, byDay, flat } = useTripLocations(days)
  // null = "All days"
  const [activeDay, setActiveDay] = useState<string | null>(null)

  // Build Open in Maps URL for the currently visible points.
  const handleOpenInMaps = () => {
    const visiblePoints =
      activeDay === null
        ? flat
        : byDay.find((d) => d.dayId === activeDay)?.points ?? []

    const points = visiblePoints
      .filter((p) => hasValidCoords(p.lat, p.lng))
      .slice(0, MAX_WAYPOINTS)

    // When there are no coordinate-bearing points, fall back to opening
    // Google Maps without a route.
    const url = buildMapsDirectionsUrl(points) ?? "https://www.google.com/maps/"

    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!API_KEY) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Map disabled — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
        <code>frontend/.env.local</code>.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-xl border bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-xs text-destructive">Failed to load activities.</p>
    )
  }

  const visibleByDay =
    activeDay === null ? byDay : byDay.filter((d) => d.dayId === activeDay)
  const visiblePoints =
    activeDay === null ? flat : visibleByDay.flatMap((d) => d.points)

  // Compute route stats
  const totalPoints = visiblePoints.length
  const activeDayData = activeDay
    ? byDay.find((d) => d.dayId === activeDay)
    : null

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[500px] flex-col gap-0 overflow-hidden rounded-xl border shadow-sm md:flex-row">
      {/* Left panel: day selector + activity list */}
      {/* On mobile: compact horizontal day tabs only; full list on md+ */}
      <aside className="flex w-full shrink-0 flex-col border-b bg-background md:w-72 md:border-b-0 md:border-r">
        {/* Day tabs */}
        <div className="border-b p-3 md:p-4">
          <div className="mb-2 hidden items-center justify-between md:flex">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Itinerary
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveDay(null)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                activeDay === null
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              All
            </button>
            {byDay
              .filter((d) => d.points.length > 0)
              .map((d) => (
                <button
                  key={d.dayId}
                  type="button"
                  onClick={() =>
                    setActiveDay(d.dayId === activeDay ? null : d.dayId)
                  }
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeDay === d.dayId
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  style={
                    activeDay === d.dayId
                      ? { backgroundColor: colorForDay(d.dayNumber) }
                      : undefined
                  }
                >
                  Day {d.dayNumber}
                </button>
              ))}
          </div>
        </div>

        {/* Activity list — hidden on mobile, shown on md+ */}
        <div className="hidden flex-1 space-y-2 overflow-y-auto p-3 md:block">
          {visiblePoints.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No location activities
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Add location-type activities to see them here
              </p>
            </div>
          ) : (
            visiblePoints.map((p, i) => (
              <div
                key={p.activityId}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Left color bar */}
                <div
                  className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: colorForDay(p.dayNumber) }}
                />
                <div className="flex items-start gap-3 pl-2">
                  {/* Number badge */}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: colorForDay(p.dayNumber) }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.title}
                      </h4>
                    </div>
                    {p.address && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.address}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: colorForDay(p.dayNumber) }}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Day {p.dayNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Open in Maps button — visible when there are points */}
        {totalPoints > 0 && (
          <div className="hidden border-t bg-muted/30 p-3 md:block">
            <button
              type="button"
              onClick={handleOpenInMaps}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Google Maps
            </button>
          </div>
        )}

        {/* Stats panel — hidden on mobile */}
        {totalPoints > 0 && (
          <div className="hidden border-t bg-muted/30 p-4 md:block">
            <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Route Info
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Locations
                </p>
                <p className="text-sm font-bold text-primary">{totalPoints}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Days
                </p>
                <p className="text-sm font-bold text-primary">
                  {activeDayData ? 1 : byDay.filter((d) => d.points.length > 0).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Right panel: map — takes remaining height on mobile */}
      <div className="relative min-h-[300px] flex-1">
        {/* Mobile-only "Open in Maps" button — anchored at the bottom so it
            doesn't cover the default map controls (compass, fullscreen) which
            sit at the top-right. */}
        {totalPoints > 0 && (
          <button
            type="button"
            onClick={handleOpenInMaps}
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-primary/90 md:hidden"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Google Maps
          </button>
        )}
        {visiblePoints.length === 0 ? (

          <div className="flex h-full flex-col items-center justify-center bg-muted/20 text-center">
            <svg
              className="mb-4 h-16 w-16 text-muted-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-sm font-medium text-muted-foreground">
              No locations to show
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add location-type activities to see the route
            </p>
          </div>
        ) : (
          <APIProvider apiKey={API_KEY}>
            <Map
              mapId={MAP_ID}
              style={{ width: "100%", height: "100%" }}
              defaultCenter={{
                lat: visiblePoints[0].lat,
                lng: visiblePoints[0].lng,
              }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              <Markers points={visiblePoints} />
              {visibleByDay.map((d) => (
                <Polyline
                  key={d.dayId}
                  path={d.points.map((p) => ({ lat: p.lat, lng: p.lng }))}
                  color={colorForDay(d.dayNumber)}
                />
              ))}
              <FitBounds points={visiblePoints} />
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  )
}

function Markers({ points }: { points: LocationPoint[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  return (
    <>
      {points.map((p, i) => (
        <AdvancedMarker
          key={p.activityId}
          position={{ lat: p.lat, lng: p.lng }}
          onClick={() => setOpenIdx(openIdx === i ? null : i)}
          title={p.title}
        >
          <Pin
            background={colorForDay(p.dayNumber)}
            borderColor="#ffffff"
            glyphColor="#ffffff"
            glyph={String(i + 1)}
          />
        </AdvancedMarker>
      ))}
      {openIdx !== null && points[openIdx] && (
        <InfoWindow
          position={{
            lat: points[openIdx].lat,
            lng: points[openIdx].lng,
          }}
          onCloseClick={() => setOpenIdx(null)}
        >
          <div className="space-y-0.5 pr-2">
            <p className="text-sm font-semibold">{points[openIdx].title}</p>
            <p className="text-xs text-muted-foreground">
              Day {points[openIdx].dayNumber}
            </p>
            {points[openIdx].address && (
              <p className="text-xs">{points[openIdx].address}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

function Polyline({
  path,
  color,
}: {
  path: { lat: number; lng: number }[]
  color: string
}) {
  const map = useMap()
  useEffect(() => {
    if (!map || path.length < 2) return
    const line = new google.maps.Polyline({
      path,
      map,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 3,
    })
    return () => line.setMap(null)
  }, [map, path, color])
  return null
}

function FitBounds({ points }: { points: LocationPoint[] }) {
  const map = useMap()
  const key = useMemo(
    () => points.map((p) => p.activityId).join("|"),
    [points],
  )
  useEffect(() => {
    if (!map || points.length === 0) return
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng })
      map.setZoom(13)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 64)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}
