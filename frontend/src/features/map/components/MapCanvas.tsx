"use client"

import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"

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
export function MapCanvas(props: MapRendererProps) {
  if (!MAP_ENABLED) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">The map is turned off for this deployment.</p>
      </div>
    )
  }
  return <Renderer {...props} />
}
