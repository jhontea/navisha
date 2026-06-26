// Utility to resolve a trip destination (e.g. "Semarang") to a cover image
// and description using Google Places. Uses the SAME AutocompleteService →
// PlacesService.getDetails pattern proven in resolveDraftLocations.ts.
// Called before POST /trips/from-draft so the persisted trip has a real
// photo and address, not AI-hallucinated data.

const MAX_PHOTO_WIDTH = 800

export interface DestinationMeta {
  coverImageUrl: string
  description: string
}

/**
 * Google Places getUrl() returns a 2KB+ URL with callback, referer, and token
 * params embedded. Parse out just the base64 photo reference (the `1s` param)
 * and rebuild a clean, short /place/photo URL.
 */
function shortPhotoUrl(photo: google.maps.places.PlacePhoto): string {
  const raw = photo.getUrl({ maxWidth: MAX_PHOTO_WIDTH })
  // Extract the 1s param (base64 photo reference) from the JS API URL.
  const match = raw.match(/[?&]1s=([^&]+)/)
  if (!match) return raw // fallback to long URL if parsing fails
  const ref = match[1]
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${MAX_PHOTO_WIDTH}&photoreference=${ref}&key=${key}`
}

export async function resolveDestinationMeta(
  destination: string,
): Promise<DestinationMeta | null> {
  if (!destination) return null

  const places = await waitForPlaces()
  if (!places) return null

  const placeId = await autocompletePlaceId(places, destination)
  if (!placeId) {
    return { coverImageUrl: "", description: destination }
  }

  return new Promise((resolve) => {
    const svc = new places.PlacesService(document.createElement("div"))
    svc.getDetails(
      { placeId, fields: ["photos", "formatted_address"] },
      (place, status) => {
        let coverImageUrl = ""
        const desc = place?.formatted_address ?? destination

        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.photos?.length
        ) {
          coverImageUrl = shortPhotoUrl(place.photos[0])
        }

        resolve({ coverImageUrl, description: desc })
      },
    )
  })
}

// ── Helpers ──

/** Use AutocompleteService to find the destination's place_id. */
function autocompletePlaceId(
  places: typeof google.maps.places,
  destination: string,
): Promise<string | null> {
  const svc = new places.AutocompleteService()
  return new Promise((resolve) => {
    svc.getPlacePredictions(
      { input: destination },
      (predictions, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          predictions?.length
        ) {
          resolve(predictions[0].place_id ?? null)
        } else {
          resolve(null)
        }
      },
    )
  })
}

/** Poll until google.maps.places.{PlacesService,AutocompleteService} exist. */
function waitForPlaces(): Promise<typeof google.maps.places | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const G = window.google?.maps?.places
      if (G?.PlacesService && G?.AutocompleteService) {
        resolve(G)
        return
      }
      if (++attempts > 100) {
        resolve(null)
        return
      }
      setTimeout(check, 100)
    }
    check()
  })
}


