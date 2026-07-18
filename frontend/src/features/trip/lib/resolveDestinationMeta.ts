// Resolve an AI-generated destination to a canonical Google Places address.
// Photo fields are deliberately excluded to avoid Places Photo usage.

import { searchLocationSuggestions } from "@/features/location/api"
import { LOCATION_PROVIDER } from "@/features/location/config"

export interface DestinationMeta {
  description: string
}

export async function resolveDestinationMeta(
  destination: string,
): Promise<DestinationMeta | null> {
  if (!destination) return null

  if (LOCATION_PROVIDER === "geoapify") {
    try {
      const response = await searchLocationSuggestions(destination, "region")
      return {
        description: response.suggestions[0]?.description ?? destination,
      }
    } catch {
      return { description: destination }
    }
  }

  const places = await waitForPlaces()
  if (!places) return null

  const placeId = await autocompletePlaceId(places, destination)
  if (!placeId) {
    return { description: destination }
  }

  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement("div"))
    service.getDetails(
      { placeId, fields: ["formatted_address"] },
      (place) => {
        resolve({ description: place?.formatted_address ?? destination })
      },
    )
  })
}

/** Use AutocompleteService to find the destination's place ID. */
function autocompletePlaceId(
  places: typeof google.maps.places,
  destination: string,
): Promise<string | null> {
  const service = new places.AutocompleteService()
  return new Promise((resolve) => {
    service.getPlacePredictions(
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

/** Poll until google.maps.places services are available. */
function waitForPlaces(): Promise<typeof google.maps.places | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const googlePlaces = window.google?.maps?.places
      if (googlePlaces?.PlacesService && googlePlaces?.AutocompleteService) {
        resolve(googlePlaces)
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
