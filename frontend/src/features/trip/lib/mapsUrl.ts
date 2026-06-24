/**
 * Utilities for building Google Maps URLs from trip location data.
 *
 * Two URL patterns are supported:
 * 1. **Directions URL** (multiple waypoints as a route):
 *    `https://www.google.com/maps/dir/lat,lng/lat,lng/...`
 * 2. **Search URL** (fallback when no coordinates exist):
 *    `https://www.google.com/maps/search/?api=1&query=...`
 *
 * Google Maps limits ~10 waypoints per directions URL.
 * If more than MAX_WAYPOINTS points are provided, the first 10 are used.
 */

export interface MapPoint {
  lat: number
  lng: number
  label?: string
}

/** Maximum waypoints Google Maps accepts in a directions URL. */
export const MAX_WAYPOINTS = 10

/**
 * Check whether lat/lng values represent a valid, non-zero coordinate.
 * Rejects null, undefined, NaN, and the sentinel value (0, 0).
 */
export function hasValidCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (lat == null || lng == null) return false
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false
  // (0, 0) is Null Island — almost certainly a placeholder/sentinel.
  if (lat === 0 && lng === 0) return false
  return true
}

/**
 * Build a Google Maps directions URL from an array of MapPoints.
 *
 * - If `points` is empty → returns `null` (caller should fall back to search URL).
 * - If `points` has 1 location → still valid (Google Maps shows a single marker).
 * - If `points` exceeds MAX_WAYPOINTS → only the first N are included.
 *   Caller should notify the user about truncation.
 *
 * Each waypoint is formatted as `lat,lng` (no label — Google Maps doesn't
 * support labels in the directions URL path; the marker title is derived
 * from the coordinates).
 */
export function buildMapsDirectionsUrl(points: MapPoint[]): string | null {
  if (points.length === 0) return null

  const truncated = points.slice(0, MAX_WAYPOINTS)
  const waypoints = truncated.map((p) => `${p.lat},${p.lng}`).join("/")

  return `https://www.google.com/maps/dir/${waypoints}/`
}

/**
 * Build a Google Maps search URL from a text query.
 *
 * Used as a fallback when a trip has no coordinate-bearing locations,
 * so the user at least sees the destination on the map.
 */
export function buildMapsSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query)
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`
}

/**
 * Build a Google Maps URL that centers on a single location (lat, lng)
 * with an optional place name query for the marker label.
 *
 * Pattern: `https://www.google.com/maps?q=lat,lng&query=Name`
 */
export function buildMapsPinUrl(lat: number, lng: number, name?: string): string {
  const base = `https://www.google.com/maps?q=${lat},${lng}`
  if (name) {
    return `${base}&query=${encodeURIComponent(name)}`
  }
  return base
}
