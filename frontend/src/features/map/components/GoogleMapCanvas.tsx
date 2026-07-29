"use client"

import { useEffect, useMemo, useState } from "react"
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps"
import { LoaderCircle, MapPin } from "lucide-react"
import { hasValidCoords } from "@/features/trip/lib/mapsUrl"
import type { DayLocations, LocationPoint } from "../hooks/useTripLocations"
import { colorForDay } from "./mapColors"

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
const MAP_ID = "cc475d9a8bf16e26f8975c02"

interface Props {
  visiblePoints: LocationPoint[]
  visibleByDay: DayLocations[]
  onOpenInMaps: (point: LocationPoint) => void
  selectedActivityId: string | null
  onSelectActivity: (point: LocationPoint) => void
}

export function GoogleMapCanvas(props: Props) {
  return (
    <APIProvider apiKey={API_KEY}>
      <GoogleMap
        mapId={MAP_ID}
        style={{ width: "100%", height: "100%" }}
        defaultCenter={{
          lat: props.visiblePoints[0].lat || 0,
          lng: props.visiblePoints[0].lng || 0,
        }}
        defaultZoom={11}
        gestureHandling="greedy"
        disableDefaultUI={false}
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
}: Props) {
  const map = useMap()
  const [resolved, setResolved] = useState<
    Record<string, { lat: number; lng: number }>
  >({})
  const [loading, setLoading] = useState(false)
  const needGeocode = visiblePoints.filter(
    (point) =>
      !hasValidCoords(point.lat, point.lng) &&
      point.locationName.trim() !== "" &&
      !resolved[point.activityId],
  )
  const pendingKey = needGeocode.map((point) => point.activityId).join("|")

  useEffect(() => {
    if (!map || pendingKey === "") return
    let cancelled = false
    setLoading(true)

    const run = async () => {
      let attempts = 0
      while (attempts <= 50 && !cancelled) {
        if (window.google?.maps?.Geocoder) break
        attempts += 1
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (cancelled || attempts > 50) {
        setLoading(false)
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
      setLoading(false)
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
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
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
            selectedActivityId={selectedActivityId}
            onSelectActivity={onSelectActivity}
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
          <FitBounds points={displayable} />
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

  return (
    <>
      {points.map((point, index) => {
        const isSelected = point.activityId === selectedActivityId
        return (
          <AdvancedMarker
            key={point.activityId}
            position={{ lat: point.lat, lng: point.lng }}
            onClick={() => {
              setOpenIndex(openIndex === index ? null : index)
              onSelectActivity(point)
            }}
            title={point.title}
          >
            <Pin
              background={colorForDay(point.dayNumber)}
              borderColor={isSelected ? "#fbbf24" : "#ffffff"}
              glyphColor="#ffffff"
              glyph={String(index + 1)}
              scale={isSelected ? 1.35 : 1}
            />
          </AdvancedMarker>
        )
      })}
      {openIndex !== null && points[openIndex] && (
        <InfoWindow
          position={{ lat: points[openIndex].lat, lng: points[openIndex].lng }}
          onCloseClick={() => setOpenIndex(null)}
        >
          <div className="space-y-1 pr-2">
            <p className="text-sm font-semibold">{points[openIndex].title}</p>
            <p className="text-xs text-muted-foreground">
              Day {points[openIndex].dayNumber}
            </p>
            {points[openIndex].address && (
              <p className="text-xs">{points[openIndex].address}</p>
            )}
            <button
              type="button"
              onClick={() => onOpenInMaps(points[openIndex])}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <MapPin className="h-3.5 w-3.5" />
              Open in Google Maps
            </button>
          </div>
        </InfoWindow>
      )}
    </>
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

function FitBounds({ points }: { points: LocationPoint[] }) {
  const map = useMap()
  const key = useMemo(
    () => points.map((point) => point.activityId).join("|"),
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
    points.forEach((point) =>
      bounds.extend({ lat: point.lat, lng: point.lng }),
    )
    map.fitBounds(bounds, 64)
    // key captures the displayed set without depending on a fresh array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}
