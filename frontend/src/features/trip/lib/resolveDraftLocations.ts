import type { TripDraft, ActivityDraft } from "../types"
import { resolveLocationSuggestions } from "@/features/location/api"
import { LOCATION_PROVIDER } from "@/features/location/config"
import type { LocationSuggestion } from "@/features/location/types"

const BOUND_KM = 50
const DEG_LAT_PER_KM = 1 / 111.32
const NORMAL_CONFIDENCE = 0.58
const NORMAL_NAME_SCORE = 0.45
const GLOBAL_CONFIDENCE = 0.72
const GLOBAL_NAME_SCORE = 0.72

const STOP_WORDS = new Set([
  "a", "at", "dan", "dari", "di", "explore", "in", "jalan", "ke",
  "makan", "ngopi", "the", "to", "visit", "visiting",
])

const GENERIC_PLACE_WORDS = new Set([
  "airport", "bandara", "bar", "cafe", "coffee", "eatery", "food", "hotel",
  "market", "mall", "museum", "park", "restaurant", "restoran", "shop",
  "station", "stasiun", "store", "temple",
])

const CATEGORY_TYPES: Record<string, string[]> = {
  kuliner: ["bakery", "cafe", "food", "meal_takeaway", "restaurant"],
  "wisata alam": ["natural_feature", "park", "tourist_attraction"],
  budaya: ["museum", "place_of_worship", "tourist_attraction"],
  belanja: ["market", "shopping_mall", "store"],
  transportasi: ["airport", "bus_station", "subway_station", "train_station", "transit_station"],
  akomodasi: ["lodging"],
}

interface PlaceCandidate {
  name: string
  description: string
  lat: number
  lng: number
  externalId: string
  types?: string[]
}

interface ScoredCandidate {
  candidate: PlaceCandidate
  score: number
  nameScore: number
}

/**
 * Resolves AI place names only when a candidate is sufficiently similar to
 * the intended place. Ambiguous matches stay usable as itinerary items, but
 * carry no coordinates until the user confirms them in the activity form.
 */
export async function resolveDraftLocations(
  draft: TripDraft,
  destination: string = "",
): Promise<TripDraft> {
  const cloned: TripDraft = {
    ...draft,
    days: draft.days.map((day) => ({
      ...day,
      activities: day.activities.map((act) => ({ ...act })),
    })),
  }

  const targets: { key: string; act: ActivityDraft; name: string }[] = []
  for (const day of cloned.days) {
    for (const act of day.activities) {
      if (act.type !== "location") continue
      if (act.lat != null && act.lng != null) continue
      const name = (act.location_name || act.title).trim()
      if (!name) continue
      markNeedsReview(act)
      targets.push({ key: `${day.day_number}:${targets.length}`, act, name })
    }
  }
  if (targets.length === 0) return cloned

  if (LOCATION_PROVIDER === "geoapify") {
    try {
      const response = await resolveLocationSuggestions(
        targets.map(({ key, name }) => ({ key, name })),
        destination,
      )
      targets.forEach(({ key, act, name }) => {
        const best = chooseBest(
          (response.results[key] ?? []).map(fromLocationSuggestion),
          name,
          destination,
          act.category,
        )
        if (best) applyCandidate(act, best)
      })
    } catch {
      // Fail open: unresolved activities remain reviewable and editable.
    }
    return cloned
  }

  const places = await waitForPlaces()
  if (!places) return cloned

  let restriction: google.maps.LatLngBoundsLiteral | null = null
  if (destination) {
    const center = await geocodeDestination(destination)
    if (center) restriction = boundsAround(center)
  }

  const autocomplete = new places.AutocompleteService()
  const details = new places.PlacesService(document.createElement("div"))

  await Promise.allSettled(
    targets.map(async ({ act, name }) => {
      const contextualInput = destination ? `${name} ${destination}` : name
      const localCandidates = await searchGoogleCandidates(
        autocomplete,
        details,
        contextualInput,
        restriction,
        name,
      )
      const localBest = chooseBest(
        localCandidates,
        name,
        destination,
        act.category,
      )
      if (localBest) {
        applyCandidate(act, localBest)
        return
      }

      // A specific airport/station may intentionally be outside the trip's
      // main destination. Permit a global fallback only for a very close name.
      if (destination) {
        const globalCandidates = await searchGoogleCandidates(
          autocomplete,
          details,
          name,
          null,
          name,
        )
        const globalBest = chooseBest(
          globalCandidates,
          name,
          "",
          act.category,
          true,
        )
        if (globalBest) applyCandidate(act, globalBest)
      }
    }),
  )

  return cloned
}

function markNeedsReview(act: ActivityDraft) {
  act.lat = null
  act.lng = null
  act.address = ""
  act.google_place_id = ""
  act.location_verification = "needs_review"
  act.location_confidence = null
}

function applyCandidate(act: ActivityDraft, match: ScoredCandidate) {
  const { candidate } = match
  act.location_name = candidate.name || act.location_name
  act.address = candidate.description
  act.lat = candidate.lat
  act.lng = candidate.lng
  act.google_place_id = candidate.externalId
  act.location_verification = "verified"
  act.location_confidence = Math.round(match.score * 100)
}

function chooseBest(
  candidates: PlaceCandidate[],
  intendedName: string,
  destination: string,
  category: string,
  globalFallback = false,
): ScoredCandidate | null {
  const ranked = candidates
    .map((candidate) => scoreCandidate(candidate, intendedName, destination, category))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (!best) return null

  const minConfidence = globalFallback ? GLOBAL_CONFIDENCE : NORMAL_CONFIDENCE
  const minNameScore = globalFallback ? GLOBAL_NAME_SCORE : NORMAL_NAME_SCORE
  return best.score >= minConfidence && best.nameScore >= minNameScore
    ? best
    : null
}

export function scoreCandidate(
  candidate: PlaceCandidate,
  intendedName: string,
  destination: string,
  category: string,
): ScoredCandidate {
  const nameScore = weightedJaccard(intendedName, candidate.name)
  const destinationTokens = tokens(destination)
  const descriptionTokens = new Set(tokens(candidate.description))
  const destinationScore = destinationTokens.length === 0
    ? 0
    : destinationTokens.filter((token) => descriptionTokens.has(token)).length / destinationTokens.length
  const expectedTypes = CATEGORY_TYPES[normalize(category)] ?? []
  const categoryScore = expectedTypes.length > 0 && candidate.types?.some((type) => expectedTypes.includes(type))
    ? 1
    : 0

  const score = destinationTokens.length > 0
    ? nameScore * 0.78 + destinationScore * 0.17 + categoryScore * 0.05
    : nameScore * 0.94 + categoryScore * 0.06
  return { candidate, score, nameScore }
}

function weightedJaccard(left: string, right: string): number {
  const a = new Set(tokens(left))
  const b = new Set(tokens(right))
  if (a.size === 0 || b.size === 0) return 0
  const union = new Set(Array.from(a).concat(Array.from(b)))
  let intersectionWeight = 0
  let unionWeight = 0
  for (const token of Array.from(union)) {
    const weight = GENERIC_PLACE_WORDS.has(token) ? 0.2 : 1
    unionWeight += weight
    if (a.has(token) && b.has(token)) intersectionWeight += weight
  }
  return unionWeight === 0 ? 0 : intersectionWeight / unionWeight
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function fromLocationSuggestion(suggestion: LocationSuggestion): PlaceCandidate {
  return {
    name: suggestion.name,
    description: suggestion.description,
    lat: suggestion.lat,
    lng: suggestion.lng,
    externalId: suggestion.external_id,
  }
}

async function searchGoogleCandidates(
  autocomplete: google.maps.places.AutocompleteService,
  details: google.maps.places.PlacesService,
  input: string,
  restriction: google.maps.LatLngBoundsLiteral | null,
  intendedName: string,
): Promise<PlaceCandidate[]> {
  const predictions = await getPredictions(autocomplete, input, restriction)
  const likely = predictions
    .sort((a, b) =>
      weightedJaccard(intendedName, b.structured_formatting?.main_text ?? b.description) -
      weightedJaccard(intendedName, a.structured_formatting?.main_text ?? a.description),
    )
    .slice(0, 3)
  const settled = await Promise.allSettled(likely.map((prediction) => getPlaceDetails(details, prediction.place_id)))
  return settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : [])
}

function getPredictions(
  service: google.maps.places.AutocompleteService,
  input: string,
  restriction: google.maps.LatLngBoundsLiteral | null,
): Promise<google.maps.places.AutocompletePrediction[]> {
  return new Promise((resolve) => {
    const request: google.maps.places.AutocompleteRequest = { input }
    if (restriction) request.locationRestriction = restriction
    service.getPlacePredictions(request, (predictions, status) => {
      resolve(status === google.maps.places.PlacesServiceStatus.OK && predictions ? predictions : [])
    })
  })
}

function getPlaceDetails(
  service: google.maps.places.PlacesService,
  placeId: string,
): Promise<PlaceCandidate | null> {
  return new Promise((resolve) => {
    service.getDetails(
      { placeId, fields: ["name", "formatted_address", "geometry", "place_id", "types"] },
      (place, status) => {
        const location = place?.geometry?.location
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !location) {
          resolve(null)
          return
        }
        resolve({
          name: place.name ?? "",
          description: place.formatted_address ?? "",
          lat: location.lat(),
          lng: location.lng(),
          externalId: place.place_id ?? placeId,
          types: place.types,
        })
      },
    )
  })
}

function boundsAround(center: google.maps.LatLng): google.maps.LatLngBoundsLiteral {
  const cLat = center.lat()
  const cLng = center.lng()
  const dLat = BOUND_KM * DEG_LAT_PER_KM
  const dLng = BOUND_KM * DEG_LAT_PER_KM / Math.cos((cLat * Math.PI) / 180)
  return { west: cLng - dLng, east: cLng + dLng, south: cLat - dLat, north: cLat + dLat }
}

async function geocodeDestination(destination: string): Promise<google.maps.LatLng | null> {
  const geocoder = new google.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ address: destination }, (results, status) => {
      resolve(status === "OK" && results?.[0]?.geometry?.location ? results[0].geometry.location : null)
    })
  })
}

function waitForPlaces(): Promise<typeof google.maps.places | null> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      const places = window.google?.maps?.places
      if (places?.PlacesService && places?.AutocompleteService) {
        resolve(places)
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
