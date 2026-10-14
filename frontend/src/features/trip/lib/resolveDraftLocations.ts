import type { TripDraft, ActivityDraft } from "../types"
import { locationProvider, type LocationProvider } from "@/features/location/provider"
import { normalize, tokens, weightedJaccard, type PlaceCandidate } from "@/features/location/placeMatching"

const NORMAL_CONFIDENCE = 0.58
const NORMAL_NAME_SCORE = 0.45
const GLOBAL_CONFIDENCE = 0.72
const GLOBAL_NAME_SCORE = 0.72

const CATEGORY_TYPES: Record<string, string[]> = {
  kuliner: ["bakery", "cafe", "food", "meal_takeaway", "restaurant"],
  "wisata alam": ["natural_feature", "park", "tourist_attraction"],
  budaya: ["museum", "place_of_worship", "tourist_attraction"],
  belanja: ["market", "shopping_mall", "store"],
  transportasi: ["airport", "bus_station", "subway_station", "train_station", "transit_station"],
  akomodasi: ["lodging"],
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
 * The provider only finds candidates; choosing one is the same for every
 * provider.
 */
export async function resolveDraftLocations(
  draft: TripDraft,
  destination: string = "",
  provider: LocationProvider = locationProvider,
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

  const queries = targets.map(({ key, name }) => ({ key, name }))
  let local: Record<string, PlaceCandidate[]> = {}
  try {
    local = await provider.findPlaceCandidates(queries, destination)
  } catch {
    // Fail open: unresolved activities remain reviewable and editable.
  }
  const unresolved = targets.filter(({ key, act, name }) => {
    const best = chooseBest(local[key] ?? [], name, destination, act.category)
    if (best) applyCandidate(act, best)
    return !best
  })

  // A specific airport/station may intentionally be outside the trip's main
  // destination. Permit a wider search only for a very close name.
  if (destination && unresolved.length > 0 && provider.findPlaceCandidatesGlobally) {
    let global: Record<string, PlaceCandidate[]> = {}
    try {
      global = await provider.findPlaceCandidatesGlobally(unresolved.map(({ key, name }) => ({ key, name })))
    } catch {
      // Fail open, as above.
    }
    for (const { key, act, name } of unresolved) {
      const best = chooseBest(global[key] ?? [], name, "", act.category, true)
      if (best) applyCandidate(act, best)
    }
  }

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
