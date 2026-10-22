"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  ControlPosition,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps"
import { LoaderCircle, MapPin } from "lucide-react"
import { hasValidCoords } from "@/features/trip/lib/mapsUrl"
import type { LocationPoint } from "../hooks/useTripLocations"
import { framePoints, MAX_FIT_ZOOM } from "../lib/mapViewport"
import type { MapRendererProps } from "./MapCanvas"
import { colorForDay } from "./mapColors"
import { MAX_LABELLED_POINTS, PIN_SELECTED_SHADOW, PIN_SHADOW, PIN_SIZE, STAY, shortLabel } from "./pinStyle"
import { cn } from "@/lib/utils"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
// "Navisha Web Vector" map ID in the navisha Cloud project. Its base look
// (soft land, water and parks, no POI labels) is the "Navisha Soft" style
// linked to it in the Cloud console; with a map ID, JSON `styles` set here
// would be ignored. Vector: the cloud style format does not apply to the old
// raster ID (cc475d9a8bf16e26f8975c02).
const MAP_ID = "cc475d9a8bf16e267491d389"

type Props = MapRendererProps & { visiblePoints: LocationPoint[] }

/** Indonesia, for a map that mounts before it has any place to show. */
const FALLBACK_CENTER = { lat: -2.5, lng: 118 }

/** Google Maps renderer behind <MapCanvas> (NEXT_PUBLIC_MAP_PROVIDER=google). */
export function GoogleMapCanvas(rendererProps: MapRendererProps) {
  const visiblePoints = useMemo(
    () => rendererProps.visibleByDay.flatMap((day) => day.points),
    [rendererProps.visibleByDay],
  )
  // No early return for zero points: the map stays mounted (and keeps its
  // view) while a day has nothing to show; a new map would be a new billed load.
  const first = visiblePoints[0]
  const props: Props = { ...rendererProps, visiblePoints }
  return (
    <APIProvider apiKey={API_KEY}>
      <GoogleMap
        mapId={MAP_ID}
        style={{ width: "100%", height: "100%" }}
        defaultCenter={first ? { lat: first.lat || 0, lng: first.lng || 0 } : FALLBACK_CENTER}
        defaultZoom={first ? 11 : 4}
        gestureHandling="greedy"
        // Only zoom: the page has its own fullscreen toggle, and Street View or
        // map types do not fit a trip overview.
        disableDefaultUI
        zoomControl
        // Top right like the MapLibre map: the bottom edge sits under the tab bar.
        zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
        // Google's own place popups would compete with our pins.
        clickableIcons={false}
      >
        <GeocodingLayer {...props} />
      </GoogleMap>
    </APIProvider>
  )
}

function GeocodingLayer({
  visiblePoints,
  visibleByDay,
  onOpenInMaps,
  selectedActivityId,
  onSelectActivity,
  showAll,
  onOutsideChange,
}: Props) {
  const map = useMap()
  const [resolved, setResolved] = useState<
    Record<string, { lat: number; lng: number }>
  >({})
  // pendingKey whose geocoding has finished (or given up).
  const [settledKey, setSettledKey] = useState("")
  const needGeocode = visiblePoints.filter(
    (point) =>
      !hasValidCoords(point.lat, point.lng) &&
      point.locationName.trim() !== "" &&
      !resolved[point.activityId],
  )
  const pendingKey = needGeocode.map((point) => point.activityId).join("|")
  const loading = map != null && pendingKey !== "" && settledKey !== pendingKey

  useEffect(() => {
    if (!map || pendingKey === "") return
    let cancelled = false
    const key = pendingKey

    const run = async () => {
      let attempts = 0
      while (attempts <= 50 && !cancelled) {
        if (window.google?.maps?.Geocoder) break
        attempts += 1
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (cancelled) return
      if (attempts > 50) {
        setSettledKey(key)
        return
      }

      const geocoder = new window.google.maps.Geocoder()
      const results = await Promise.allSettled(
        needGeocode.map(async (point) => {
          const response = await geocoder.geocode({ address: point.locationName })
          const location = response.results?.[0]?.geometry?.location
          return location
            ? { id: point.activityId, lat: location.lat(), lng: location.lng() }
            : null
        }),
      )
      if (cancelled) return

      const next: Record<string, { lat: number; lng: number }> = {}
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          next[result.value.id] = {
            lat: result.value.lat,
            lng: result.value.lng,
          }
        }
      }
      if (Object.keys(next).length > 0) {
        setResolved((current) => ({ ...current, ...next }))
      }
      setSettledKey(key)
    }

    void run()
    return () => {
      cancelled = true
    }
    // pendingKey captures the unresolved set; needGeocode is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pendingKey])

  const applyCoords = (points: LocationPoint[]): LocationPoint[] =>
    points
      .map((point) => {
        if (hasValidCoords(point.lat, point.lng)) return point
        const coordinates = resolved[point.activityId]
        return coordinates ? { ...point, ...coordinates } : point
      })
      .filter((point) => hasValidCoords(point.lat, point.lng))
  const displayable = applyCoords(visiblePoints)

  return (
    <>
      {displayable.length === 0 && needGeocode.length > 0 && loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Resolving locations…
          </p>
        </div>
      )}
      {displayable.length > 0 && (
        <>
          <Markers
            points={displayable}
            onOpenInMaps={onOpenInMaps}
            selectedActivityId={selectedActivityId ?? null}
            onSelectActivity={onSelectActivity ?? (() => {})}
          />
          {visibleByDay.map((day) => (
            <Polyline
              key={day.dayId}
              path={applyCoords(day.points).map((point) => ({
                lat: point.lat,
                lng: point.lng,
              }))}
              color={colorForDay(day.dayNumber)}
            />
          ))}
          <FitBounds points={displayable} showAll={showAll} onOutsideChange={onOutsideChange} />
        </>
      )}
    </>
  )
}

function Markers({
  points,
  onOpenInMaps,
  selectedActivityId,
  onSelectActivity,
}: {
  points: LocationPoint[]
  onOpenInMaps: (point: LocationPoint) => void
  selectedActivityId: string | null
  onSelectActivity: (point: LocationPoint) => void
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const map = useMap()

  useEffect(() => {
    if (!map || !selectedActivityId) return
    const index = points.findIndex(
      (point) => point.activityId === selectedActivityId,
    )
    if (index === -1) return
    map.panTo({ lat: points[index].lat, lng: points[index].lng })
    if ((map.getZoom() ?? 0) < 13) map.setZoom(13)
  }, [map, points, selectedActivityId])

  const labelled = points.length <= MAX_LABELLED_POINTS

  return (
    <>
      {points.map((point, index) => {
        const isSelected = point.activityId === selectedActivityId
        const isStay = point.kind === "stay"
        const glyph = isStay ? "H" : String(points.slice(0, index + 1).filter((p) => p.kind !== "stay").length)
        return (
          <AdvancedMarker
            key={`${point.activityId}:${index}`}
            position={{ lat: point.lat, lng: point.lng }}
            // Bottom of the content, raised by half the circle: the circle's
            // centre sits on the coordinate (same as the MapLibre pins).
            anchorPoint={["50%", `calc(100% - ${PIN_SIZE / 2}px)`]}
            zIndex={isSelected ? 10 : 2}
            onClick={() => {
              setOpenIndex(openIndex === index ? null : index)
              onSelectActivity(point)
            }}
            title={point.title}
          >
            <PinContent
              label={labelled ? shortLabel(point.title) : null}
              glyph={glyph}
              color={isStay ? STAY : colorForDay(point.dayNumber)}
              square={isStay}
              selected={isSelected}
            />
          </AdvancedMarker>
        )
      })}
      {openIndex !== null && points[openIndex] && (
        <InfoWindow
          position={{ lat: points[openIndex].lat, lng: points[openIndex].lng }}
          onCloseClick={() => setOpenIndex(null)}
        >
          <div className="max-w-60 space-y-1 pr-2 font-sans text-foreground">
            <p className="font-display text-sm font-extrabold">{points[openIndex].title}</p>
            <p className="text-xs text-muted-foreground">
              Day {points[openIndex].dayNumber}
            </p>
            {points[openIndex].address && (
              <p className="text-xs text-muted-foreground">{points[openIndex].address}</p>
            )}
            <Button
              type="button"
              onClick={() => onOpenInMaps(points[openIndex])}
              size="xs"
              className="mt-1"
            >
              <MapPin className="h-3.5 w-3.5" />
              Open in Google Maps
            </Button>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

/** Name pill above a numbered circle (stays: rounded square "H"), as in MapLibreCanvas. */
function PinContent({
  label,
  glyph,
  color,
  square,
  selected,
}: {
  label: string | null
  glyph: string
  color: string
  square: boolean
  selected: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 font-sans text-xs font-bold text-foreground shadow-[0_2px_8px_rgb(35_50_77/0.18)]">
          {label}
        </span>
      )}
      <span
        className={cn(
          "flex size-[30px] items-center justify-center border-white font-sans text-xs font-extrabold text-white",
          square ? "rounded-[10px]" : "rounded-full",
          selected ? "border-[3px]" : "border-[2.5px]",
        )}
        // Per-day colour and selection ring are data-driven.
        style={{ background: color, boxShadow: selected ? PIN_SELECTED_SHADOW : PIN_SHADOW }}
      >
        {glyph}
      </span>
    </div>
  )
}

function Polyline({ path, color }: {
  path: { lat: number; lng: number }[]
  color: string
}) {
  const map = useMap()
  const pathKey = path.map((point) => `${point.lat},${point.lng}`).join("|")
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
    // pathKey captures coordinates without depending on a fresh array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pathKey, color])
  return null
}

function FitBounds({ points, showAll, onOutsideChange }: {
  points: LocationPoint[]
  showAll: boolean
  onOutsideChange: (outside: number) => void
}) {
  const map = useMap()
  const key = useMemo(
    () => points.map((point) => point.activityId).join("|"),
    [points],
  )
  useEffect(() => {
    if (!map) return
    if (points.length === 0) {
      onOutsideChange(0)
      return
    }
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng })
      map.setZoom(13)
      onOutsideChange(0)
      return
    }
    const { framed, outside } = framePoints(points)
    onOutsideChange(outside)
    const bounds = new google.maps.LatLngBounds()
    ;(showAll ? points : framed).forEach((point) =>
      bounds.extend({ lat: point.lat, lng: point.lng }),
    )
    map.fitBounds(bounds, 64)
    // fitBounds has no maxZoom: clamp once, after this fit settles. The user
    // can still zoom in further by hand.
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM)
    })
    return () => listener.remove()
    // key captures the displayed set without depending on a fresh array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, showAll])
  return null
}
