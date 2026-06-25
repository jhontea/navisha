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

export async function resolveDestinationMeta(
  destination: string,
): Promise<DestinationMeta | null> {
  if (!destination) return null

  const places = await waitForPlaces()
  if (!places) return null

  // Step 1: Use AutocompleteService to find the destination as a Place
  // (e.g. "Semarang" → prediction with place_id).
  const placeId = await autocompletePlaceId(places, destination)
  if (!placeId) {
    // Fallback: use the raw destination string as description.
    return { coverImageUrl: "", description: destination }
  }

  // Step 2: GetDetails for photo + formatted_address.
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
          coverImageUrl = place.photos[0].getUrl({ maxWidth: MAX_PHOTO_WIDTH }) ?? ""
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


