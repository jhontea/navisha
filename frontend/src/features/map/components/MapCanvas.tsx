"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"

import { Chip } from "@/components/Chip"
import { MAP_PROVIDER } from "@/features/location/config"
import type { DayLocations, LocationPoint } from "../hooks/useTripLocations"

/**
 * What every map renderer receives. MapLibre (default) and Google Maps both
 * implement it; callers only use <MapCanvas>, never a renderer directly.
 */
export interface MapRendererProps {
  /** Stops grouped by day, in itinerary order: places get numbered markers,
   *  hotel stops ("stay") an "H"; each day's stops are joined by its route. */
  visibleByDay: DayLocations[]
  /** Open one place in Google Maps (marker popup action). */
  onOpenInMaps: (point: LocationPoint) => void
  /** Highlight this activity's marker. */
  selectedActivityId?: string | null
  /** Called when a marker is chosen, to highlight the matching list item. */
  onSelectActivity?: (point: LocationPoint) => void
  /** Frame every place, including far-away ones <MapCanvas> would leave out of the view. */
  showAll: boolean
  /** Reports how many places the current view leaves out (see framePoints). */
  onOutsideChange: (outside: number) => void
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

/** False when maps are turned off, or Google is selected without an API key. */
export const MAP_ENABLED = MAP_PROVIDER !== "disabled" && !(MAP_PROVIDER === "google" && !GOOGLE_MAPS_API_KEY)

const loading = () => <div className="h-full animate-pulse bg-muted" aria-hidden="true" />

// Each renderer is its own chunk, loaded only for the configured provider.
const Renderer =
  MAP_PROVIDER === "google"
    ? dynamic(() => import("./GoogleMapCanvas").then((m) => m.GoogleMapCanvas), { ssr: false, loading })
    : dynamic(() => import("./MapLibreCanvas").then((m) => m.MapLibreCanvas), { ssr: false, loading })

/** The map for a set of places, drawn by the configured provider (NEXT_PUBLIC_MAP_PROVIDER). */
export function MapCanvas(props: Omit<MapRendererProps, "showAll" | "onOutsideChange">) {
  const dayKey = props.visibleByDay.map((d) => d.dayId).join("|")
  // Show all applies to the days it was pressed on; another day filter starts framed again.
  const [showAllFor, setShowAllFor] = useState<string | null>(null)
  if (showAllFor !== null && showAllFor !== dayKey) setShowAllFor(null)
  const [outside, setOutside] = useState(0)
  const showAll = showAllFor === dayKey
  if (!MAP_ENABLED) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">The map is turned off for this deployment.</p>
      </div>
    )
  }
  return (
    <div className="relative h-full">
      <Renderer {...props} showAll={showAll} onOutsideChange={setOutside} />
      {outside > 0 && !showAll && (
        <Chip onClick={() => setShowAllFor(dayKey)} className="absolute bottom-3 left-3 z-10 h-auto py-1.5 text-xs shadow-card">
          {outside} {outside === 1 ? "place" : "places"} outside the view · Show all
        </Chip>
      )}
    </div>
  )
}
