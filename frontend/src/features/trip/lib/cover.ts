/**
 * Google Places photo URLs already stored on trips must not be rendered while
 * the photo feature is disabled, otherwise every image load can be billed.
 */
export function canRenderTripCover(url?: string | null): url is string {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const isGooglePlacesHost =
      parsed.hostname === "maps.googleapis.com" ||
      parsed.hostname === "places.googleapis.com"
    const isPlacesPhotoPath =
      parsed.pathname.includes("/maps/api/place/") ||
      parsed.pathname.includes("/v1/places/")

    return !(isGooglePlacesHost && isPlacesPhotoPath)
  } catch {
    return false
  }
}
