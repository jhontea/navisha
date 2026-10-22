"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import type { StyleSpecification } from "maplibre-gl"
// Import CSS only where maplibre-gl is actually used, not in root layout.
import "maplibre-gl/dist/maplibre-gl.css"
import { ExternalLink } from "lucide-react"
import { hasValidCoords } from "@/features/trip/lib/mapsUrl"

import type { LocationPoint } from "../hooks/useTripLocations"
import { framePoints, MAX_FIT_ZOOM } from "../lib/mapViewport"
import { colorForDay } from "./mapColors"
import { INK, LABEL_SHADOW, MAX_LABELLED_POINTS, PIN_SELECTED_SHADOW, PIN_SHADOW, PRIMARY, STAY, shortLabel } from "./pinStyle"
import type { MapRendererProps } from "./MapCanvas"

// maplibre-gl 6 derives its worker URL from its own import.meta.url, a file the
// bundler never emits (404, blank map). Point it at an emitted copy instead.
maplibregl.setWorkerUrl(
  new URL("../../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
)

const DEFAULT_TILE_URL = "/api/map-tiles/{z}/{x}/{y}"
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  "© OpenStreetMap contributors © CARTO"

// OpenFreeMap provides free, unlimited vector tiles with no API key and
// allows commercial use. Its "positron" style matches the CARTO light look
// the app previously used. The raster proxy (TILE_URL) remains as a fallback
// when the style cannot be fetched.
const OPENFREEMAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron"

type Props = MapRendererProps


interface ProjectedRoute {
  id: string
  color: string
  points: { x: number; y: number }[]
}

function fitTo(map: maplibregl.Map, points: LocationPoint[], duration: number) {
  const bounds = new maplibregl.LngLatBounds()
  points.forEach((p) => bounds.extend([p.lng, p.lat]))
  map.fitBounds(bounds, { padding: 64, maxZoom: MAX_FIT_ZOOM, duration })
}

export function MapLibreCanvas({
  visibleByDay,
  onOpenInMaps,
  selectedActivityId,
  onSelectActivity,
  showAll,
  onOutsideChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // activityId -> marker element, for highlight + fly-to without recreating
  // the whole map.
  const markerElsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  // Read when the map is (re)created; the effect below refits on a change.
  const showAllRef = useRef(showAll)
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

  // Stable identity key: only re-init the map when the SET of displayed
  // points actually changes (not on every parent re-render, which allocates a
  // fresh `visibleByDay` array and would otherwise recreate the map + all
  // markers on every click). Mirrors the FitBounds pattern in the Google path.
  const pointsKey = useMemo(
    () =>
      displayableByDay.flatMap((d) => d.points.map((p) => p.activityId)).join("|"),
    [displayableByDay],
  )

  useEffect(() => {
    showAllRef.current = showAll
    const map = mapRef.current
    if (!map) return
    const points = displayableByDay.flatMap((day) => day.points)
    if (points.length > 1) fitTo(map, showAll ? points : framePoints(points).framed, 600)
    // Only a Show all press refits; a changed point set recreates the map below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll])

  useEffect(() => {
    if (!containerRef.current || displayableByDay.length === 0) {
      onOutsideChange(0)
      return
    }

    setMapError(false)
    // Drop the previous view's route lines until the new map has projected
    // its own (switching days otherwise leaves a stale line until a pan).
    setRouteOverlay((prev) => ({ ...prev, routes: [] }))
    const allPoints = displayableByDay.flatMap((day) => day.points)
    // Everything the view should fit: places and stays.
    const allCoords = allPoints.map((p) => [p.lng, p.lat] as [number, number])
    const { framed, outside } = framePoints(allPoints)
    onOutsideChange(outside)
    let cancelled = false

    const rasterFallback: StyleSpecification = {
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

    const createMap = (style: StyleSpecification | string) => {
      if (cancelled || !containerRef.current) return
      let map: maplibregl.Map
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: allCoords[0],
          zoom: 11,
          attributionControl: {},
        })
      } catch {
        setMapError(true)
        return
      }
      mapRef.current = map
      // Reset marker registry on (re)create so stale refs from a previous map
      // instance don't leak into the fly-to/highlight effect.
      markerElsRef.current = new Map()

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
        let placeNumber = 0
        const labelled = allPoints.length <= MAX_LABELLED_POINTS
        allPoints.forEach((point) => {
          const isStay = point.kind === "stay"
          // Pin = optional name pill above a numbered circle; the circle sits on the coordinate.
          const pin = document.createElement("div")
          Object.assign(pin.style, {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            pointerEvents: "none",
            // Above the route overlay (z-index 1): the pin, not its children,
            // is the stacking context MapLibre positions with a transform.
            zIndex: "2",
          })
          if (labelled) {
            const label = document.createElement("span")
            label.textContent = shortLabel(point.title)
            Object.assign(label.style, {
              background: "white",
              color: INK,
              borderRadius: "9999px",
              padding: "3px 9px",
              fontSize: "12px",
              fontWeight: "700",
              whiteSpace: "nowrap",
              boxShadow: LABEL_SHADOW,
              fontFamily: "var(--font-sans), system-ui, sans-serif",
            })
            pin.appendChild(label)
          }
          const markerElement = document.createElement("button")
          markerElement.type = "button"
          markerElement.title = point.title
          markerElement.setAttribute("aria-label", point.title)
          markerElement.textContent = isStay ? "H" : String(++placeNumber)
          Object.assign(markerElement.style, {
            width: "30px",
            height: "30px",
            borderRadius: isStay ? "10px" : "9999px",
            border: "2.5px solid white",
            background: isStay ? STAY : colorForDay(point.dayNumber),
            color: "white",
            fontSize: "12px",
            fontWeight: "800",
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow: PIN_SHADOW,
            zIndex: "2",
          })
          pin.appendChild(markerElement)

          // Register marker for fly-to + highlight (focus-on-click). Clicking a
          // marker selects the matching list card (two-way sync).
          markerElsRef.current.set(point.activityId, markerElement)
          markerElement.addEventListener("click", () => {
            onSelectActivity?.(point)
          })

          const popupContent = document.createElement("div")
          popupContent.style.maxWidth = "240px"
          popupContent.style.fontFamily = "var(--font-sans), system-ui, sans-serif"
          popupContent.style.color = INK
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
            borderRadius: "9999px",
            padding: "7px 12px",
            background: PRIMARY,
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
          })
          openButton.addEventListener("click", () => onOpenInMaps(point))
          popupContent.appendChild(openButton)

          // Anchor at the bottom of the pin, nudged down by half the circle so
          // the circle's centre is on the coordinate.
          new maplibregl.Marker({ element: pin, anchor: "bottom", offset: [0, 15] })
            .setLngLat([point.lng, point.lat])
            .setPopup(new maplibregl.Popup({ offset: 22 }).setDOMContent(popupContent))
            .addTo(map)
        })

        if (allCoords.length === 1) {
          map.setCenter(allCoords[0])
          map.setZoom(13)
        } else {
          fitTo(map, showAllRef.current ? allPoints : framed, 0)
        }
        updateRouteOverlay()
      })
    }

    // Prefer the OpenFreeMap vector style (free, no key, same Positron look).
    // If it cannot be fetched, fall back to the same-origin raster proxy.
    ;(async () => {
      let style: StyleSpecification | string = OPENFREEMAP_STYLE_URL
      try {
        const styleResponse = await fetch(OPENFREEMAP_STYLE_URL, {
          signal: AbortSignal.timeout(8_000),
        })
        if (!styleResponse.ok) throw new Error(`style ${styleResponse.status}`)
        style = (await styleResponse.json()) as StyleSpecification
      } catch {
        style = rasterFallback
      }
      createMap(style)
    })()

    return () => {
      cancelled = true
      const map = mapRef.current
      if (map) {
        map.remove()
        mapRef.current = null
      }
      markerElsRef.current = new Map()
    }
    // Re-init only when the displayed point SET changes (pointsKey), not on
    // every render. onOpenInMaps/onSelectActivity are stable (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, onOpenInMaps, onSelectActivity])

    // Focus-on-click: fly to the selected marker + highlight it (amber border +
    // larger shadow + raised z-index) without recreating the map. Runs only
    // when selection changes. NOTE: we intentionally do NOT touch `transform`
    // because MapLibre overwrites it on every move to position the marker.
    useEffect(() => {
      const map = mapRef.current
      if (!map || !selectedActivityId) return
      const allPoints = displayableByDay.flatMap((d) => d.points)
      const point = allPoints.find((p) => p.activityId === selectedActivityId)
      if (!point) return

      map.flyTo({
        center: [point.lng, point.lat],
        zoom: Math.max(map.getZoom(), 13),
        duration: 800,
      })

      markerElsRef.current.forEach((el, id) => {
        const isSelected = id === selectedActivityId
        el.style.borderWidth = isSelected ? "3px" : "2.5px"
        el.style.boxShadow = isSelected ? PIN_SELECTED_SHADOW : PIN_SHADOW
        // Raise the whole pin (label included) above its neighbours.
        if (el.parentElement) el.parentElement.style.zIndex = isSelected ? "10" : "2"
      })
    }, [selectedActivityId, displayableByDay])

    if (displayableByDay.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Location coordinates are unavailable
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
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
            className="pointer-events-none absolute inset-0 z-1 h-full w-full"
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
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-xs shadow-overlay">
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
