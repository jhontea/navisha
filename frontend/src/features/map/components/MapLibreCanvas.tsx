"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import maplibregl, { type StyleSpecification } from "maplibre-gl"
import { ExternalLink } from "lucide-react"
import { hasValidCoords } from "@/features/trip/lib/mapsUrl"
import type { DayLocations, LocationPoint } from "../hooks/useTripLocations"

const DEFAULT_TILE_URL = "/api/map-tiles/{z}/{x}/{y}"
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  "© OpenStreetMap contributors © CARTO"

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

const colorForDay = (dayNumber: number) =>
  DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]

interface Props {
  visibleByDay: DayLocations[]
  onOpenInMaps: (point: LocationPoint) => void
}

interface ProjectedRoute {
  id: string
  color: string
  points: { x: number; y: number }[]
}

export function MapLibreCanvas({ visibleByDay, onOpenInMaps }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapError, setMapError] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState<{
    width: number
    height: number
    routes: ProjectedRoute[]
  }>({ width: 1, height: 1, routes: [] })

  const displayableByDay = useMemo(
    () =>
      visibleByDay
        .map((day) => ({
          ...day,
          points: day.points.filter((point) =>
            hasValidCoords(point.lat, point.lng),
          ),
        }))
        .filter((day) => day.points.length > 0),
    [visibleByDay],
  )

  useEffect(() => {
    if (!containerRef.current || displayableByDay.length === 0) return

    setMapError(false)
    const allPoints = displayableByDay.flatMap((day) => day.points)
    const style: StyleSpecification = {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: [TILE_URL],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 19,
          attribution: TILE_ATTRIBUTION,
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    }

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [allPoints[0].lng, allPoints[0].lat],
        zoom: 11,
        attributionControl: {},
      })
    } catch {
      setMapError(true)
      return
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right")
    map.on("error", (event) => {
      if (event.error) setMapError(true)
    })

    const updateRouteOverlay = () => {
      const container = map.getContainer()
      setRouteOverlay({
        width: container.clientWidth || 1,
        height: container.clientHeight || 1,
        routes: displayableByDay
          .filter((day) => day.points.length >= 2)
          .map((day) => ({
            id: day.dayId,
            color: colorForDay(day.dayNumber),
            points: day.points.map((point) =>
              map.project([point.lng, point.lat]),
            ),
          })),
      })
    }

    map.on("move", updateRouteOverlay)
    map.on("resize", updateRouteOverlay)

    map.once("load", () => {
      allPoints.forEach((point, index) => {
        const markerElement = document.createElement("button")
        markerElement.type = "button"
        markerElement.title = point.title
        markerElement.setAttribute("aria-label", point.title)
        markerElement.textContent = String(index + 1)
        Object.assign(markerElement.style, {
          width: "30px",
          height: "30px",
          borderRadius: "9999px",
          border: "2px solid white",
          background: colorForDay(point.dayNumber),
          color: "white",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgb(0 0 0 / 0.28)",
          zIndex: "2",
        })

        const popupContent = document.createElement("div")
        popupContent.style.maxWidth = "240px"
        const title = document.createElement("p")
        title.textContent = point.title
        title.style.fontWeight = "700"
        title.style.marginBottom = "4px"
        popupContent.appendChild(title)

        const dayLabel = document.createElement("p")
        dayLabel.textContent = `Day ${point.dayNumber}`
        dayLabel.style.fontSize = "12px"
        dayLabel.style.marginBottom = "4px"
        popupContent.appendChild(dayLabel)

        if (point.address) {
          const address = document.createElement("p")
          address.textContent = point.address
          address.style.fontSize = "12px"
          address.style.marginBottom = "8px"
          popupContent.appendChild(address)
        }

        const openButton = document.createElement("button")
        openButton.type = "button"
        openButton.textContent = "Open in Google Maps"
        Object.assign(openButton.style, {
          border: "0",
          borderRadius: "6px",
          padding: "6px 10px",
          background: "#2563eb",
          color: "white",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
        })
        openButton.addEventListener("click", () => onOpenInMaps(point))
        popupContent.appendChild(openButton)

        new maplibregl.Marker({ element: markerElement })
          .setLngLat([point.lng, point.lat])
          .setPopup(new maplibregl.Popup({ offset: 22 }).setDOMContent(popupContent))
          .addTo(map)
      })

      if (allPoints.length === 1) {
        map.setCenter([allPoints[0].lng, allPoints[0].lat])
        map.setZoom(13)
      } else {
        const bounds = new maplibregl.LngLatBounds()
        allPoints.forEach((point) => bounds.extend([point.lng, point.lat]))
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 })
      }
      updateRouteOverlay()
    })

    return () => {
      map.off("move", updateRouteOverlay)
      map.off("resize", updateRouteOverlay)
      map.remove()
    }
  }, [displayableByDay, onOpenInMaps])

  if (displayableByDay.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Location coordinates are unavailable
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground/70">
          Re-select the activity locations to store coordinates and show them
          on the map.
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {routeOverlay.routes.length > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          viewBox={`0 0 ${routeOverlay.width} ${routeOverlay.height}`}
          preserveAspectRatio="none"
        >
          {routeOverlay.routes.flatMap((route) => {
            const points = route.points
              .map((point) => `${point.x},${point.y}`)
              .join(" ")
            return [
              <polyline
                key={`${route.id}-outline`}
                points={points}
                fill="none"
                stroke="#ffffff"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />,
              <polyline
                key={`${route.id}-line`}
                data-route-line={route.id}
                points={points}
                fill="none"
                stroke={route.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />,
            ]
          })}
        </svg>
      )}
      {mapError && (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-md">
          <span>Some map tiles could not be loaded.</span>
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            OpenStreetMap <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  )
}
