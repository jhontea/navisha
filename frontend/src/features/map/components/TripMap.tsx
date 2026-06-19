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
import { cn } from "@/lib/utils"
import type { Day } from "@/features/trip/types"
import {
  useTripLocations,
  type DayLocations,
  type LocationPoint,
} from "../hooks/useTripLocations"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
// Cloud Console Map ID — required by AdvancedMarker. Pick a real ID from
// Google Maps Platform → Map Management.
const MAP_ID = "cc475d9a8bf16e26f8975c02"

// Stable color per day_number so polylines/markers stay visually consistent
// when toggling Days filter.
const DAY_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
]
const colorForDay = (n: number) => DAY_COLORS[(n - 1) % DAY_COLORS.length]

interface Props {
  days: Day[]
}

export function TripMap({ days }: Props) {
  const { isLoading, isError, byDay, flat } = useTripLocations(days)
  // null = "All days" (show every day's locations + polylines)
  const [activeDay, setActiveDay] = useState<string | null>(null)

  if (!API_KEY) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Map disabled — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
        <code>frontend/.env.local</code>.
      </div>
    )
  }
  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading map…</p>
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

  if (visiblePoints.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <DayFilter days={byDay} active={activeDay} onChange={setActiveDay} />
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No location activities yet. Add one via Itinerary → location type.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <DayFilter days={byDay} active={activeDay} onChange={setActiveDay} />
      <APIProvider apiKey={API_KEY}>
        <div
          style={{ height: 500, width: "100%" }}
          className="overflow-hidden rounded-lg border"
        >
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
        </div>
      </APIProvider>
    </div>
  )
}

function DayFilter({
  days,
  active,
  onChange,
}: {
  days: DayLocations[]
  active: string | null
  onChange: (dayId: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterChip
        label="All days"
        active={active === null}
        onClick={() => onChange(null)}
      />
      {days
        .filter((d) => d.points.length > 0)
        .map((d) => (
          <FilterChip
            key={d.dayId}
            label={`Day ${d.dayNumber}`}
            color={colorForDay(d.dayNumber)}
            active={active === d.dayId}
            onClick={() => onChange(d.dayId)}
          />
        ))}
    </div>
  )
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-input text-muted-foreground hover:border-ring",
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
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
          onClick={() => setOpenIdx(i)}
          title={p.title}
        >
          <Pin
            background={colorForDay(p.dayNumber)}
            borderColor="#ffffff"
            glyphColor="#ffffff"
            glyph={String(p.orderIndex + 1)}
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
          <div className="space-y-0.5">
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

// vis.gl does not expose a Polyline component; manage native overlay
// imperatively against the parent Map via useMap.
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

// Auto-fit viewport to visible points. Re-runs when the set changes
// (e.g. user toggles day filter).
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
