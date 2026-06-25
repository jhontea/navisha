// Utility to resolve location names in an AI-generated TripDraft to real
// coordinates using the Google Maps Places API. This mirrors the manual
// LocationAutocomplete form flow:
//
//   1. Geocode the trip destination → get center lat/lng
//   2. AutocompleteService.getPlacePredictions({ input, locationRestriction })
//      → get the first prediction's place_id (restricted to destination area)
//   3. PlacesService.getDetails({ placeId, fields })
//      → extract name, formatted_address, geometry.location, place_id
//
// Called BEFORE the draft is sent to `POST /trips/from-draft`, so the
// coordinates + address + place_id are persisted with the trip.
//
// locationRestriction is critical: without it, Google Places returns the most
// globally popular result (e.g. "Chapter Two Cafe" in UK instead of Bandung).
// With restriction, results are forced within ~50km of the destination center.

import type { TripDraft, ActivityDraft } from "../types"

/** ~50km in degrees latitude (used to build bounding box around destination). */
const BOUND_KM = 50
const DEG_LAT_PER_KM = 1 / 111.32

/**
 * Returns a NEW draft where every location-type activity that lacked lat/lng
 * is filled in from the Google Places API (first matching prediction → full
 * details). The original draft is not mutated.
 *
 * @param draft  The AI-generated trip draft (location_name comes from LLM).
 * @param destination  Trip destination (e.g. "Bandung") — geocoded to get
 *   center coordinates, then used as locationRestriction so Places returns
 *   only results within ~50km of the destination.
 */
export async function resolveDraftLocations(
  draft: TripDraft,
  destination: string = "",
): Promise<TripDraft> {
  // Deep-clone so we can safely mutate the activity objects we resolve.
  const cloned: TripDraft = {
    ...draft,
    days: draft.days.map((day) => ({
      ...day,
      activities: day.activities.map((act) => ({ ...act })),
    })),
  }

  // Collect references to the cloned activities that need resolution.
  const targets: { act: ActivityDraft; name: string }[] = []
  for (const day of cloned.days) {
    for (const act of day.activities) {
      if (act.type !== "location") continue
      if (act.lat != null && act.lng != null) continue
      const name = act.location_name || act.title
      if (!name) continue
      targets.push({ act, name })
    }
  }
  if (targets.length === 0) return cloned

  // Wait for the Maps & Places libraries (APIProvider loads them asynchronously).
  const places = await waitForPlaces()
  if (!places) return cloned // Maps API unavailable — skip silently.

  // ── Step 1: Geocode the destination to get a center point ──
  let restriction: google.maps.LatLngBoundsLiteral | null = null
  if (destination) {
    const center = await geocodeDestination(destination)
    if (center) {
      const cLat = center.lat()
      const cLng = center.lng()
      const dLat = BOUND_KM * DEG_LAT_PER_KM
      const dLng = BOUND_KM * DEG_LAT_PER_KM / Math.cos((cLat * Math.PI) / 180)
      restriction = {
        west: cLng - dLng,
        east: cLng + dLng,
        south: cLat - dLat,
        north: cLat + dLat,
      }
    }
  }

  const autocompleteService = new places.AutocompleteService()
  const detailsService = new places.PlacesService(
    document.createElement("div"),
  )

  // ── Step 2+3: Resolve all targets concurrently ──
  await Promise.allSettled(
    targets.map(
      ({ act, name }) =>
        new Promise<void>((resolve) => {
          // Helper: attempt resolution with a given search input.
          const tryResolve = (searchInput: string, cb: () => void) => {
            const request: google.maps.places.AutocompleteRequest = {
              input: searchInput,
            }
            if (restriction) {
              request.locationRestriction = restriction
            }

            autocompleteService.getPlacePredictions(
              request,
              (predictions, status) => {
                if (
                  status !== google.maps.places.PlacesServiceStatus.OK ||
                  !predictions?.length
                ) {
                  cb()
                  return
                }

                // Take the first prediction (best match)
                const placeId = predictions[0].place_id
                if (!placeId) {
                  cb()
                  return
                }

                // Step 3: Get full details (like the form's place_changed event)
                detailsService.getDetails(
                  {
                    placeId,
                    fields: [
                      "name",
                      "formatted_address",
                      "geometry",
                      "place_id",
                    ],
                  },
                  (place, detailStatus) => {
                    if (
                      detailStatus !==
                        google.maps.places.PlacesServiceStatus.OK ||
                      !place?.geometry?.location
                    ) {
                      cb()
                      return
                    }

                    // Fill in all location fields — same as LocationAutocomplete
                    act.location_name = place.name ?? act.location_name
                    act.address = place.formatted_address ?? ""
                    act.lat = place.geometry.location.lat()
                    act.lng = place.geometry.location.lng()
                    act.google_place_id = place.place_id ?? ""
                    resolve()
                  },
                )
              },
            )
          }

          // Primary search: append destination to the place name so Google
          // finds "Cafe X in Bandung" rather than "Cafe X in London".
          const primaryInput = destination
            ? `${name} ${destination}`
            : name
          tryResolve(primaryInput, () => {
            // Fallback: search with just the place name (no destination suffix).
            // This preserves backward compatibility when the LLM already
            // includes the city in location_name (per updated prompt rules).
            if (destination) {
              tryResolve(name, () => resolve())
            } else {
              resolve()
            }
          })
        }),
    ),
  )

  return cloned
}

// ── Helpers ──

/** Geocode a destination string (e.g. "Bandung") to lat/lng center. */
async function geocodeDestination(
  destination: string,
): Promise<google.maps.LatLng | null> {
  const geocoder = new google.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ address: destination }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        resolve(results[0].geometry.location)
      } else {
        resolve(null)
      }
    })
  })
}

/** Poll until window.google.maps.places.PlacesService exists (max ~10s). */
function waitForPlaces(): Promise<typeof google.maps.places | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const G = (window as any).google?.maps?.places
      if (G?.PlacesService && G?.AutocompleteService) {
        resolve(G)
        return
      }
      if (++attempts > 100) {
        resolve(null) // give up after ~10s
        return
      }
      setTimeout(check, 100)
    }
    check()
  })
}
