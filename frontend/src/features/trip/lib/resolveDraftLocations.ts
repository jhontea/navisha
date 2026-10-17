import type { TripDraft, ActivityDraft, LodgingDraft } from "../types"
import { locationProvider, type LocationProvider, type PlaceQuery } from "@/features/location/provider"
import { normalize, tokens, weightedJaccard, type PlaceCandidate } from "@/features/location/placeMatching"

const NORMAL_CONFIDENCE = 0.58
const NORMAL_NAME_SCORE = 0.45
const GLOBAL_CONFIDENCE = 0.72
const GLOBAL_NAME_SCORE = 0.72

/** Places per lookup request (the backend accepts up to 100). */
const BATCH_SIZE = 50

/** Result kinds that are a whole area, too coarse to pin an activity on. */
const AREA_RESULT_TYPES = new Set(["city", "county", "state", "country", "postcode", "suburb", "district"])

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

interface Target {
  key: string
  act: ActivityDraft
  query: PlaceQuery
}

/**
 * Pins AI places on the map.
 * - A candidate whose name matches the intended place (official name or the
 *   display name) is applied and marked verified.
 * - Otherwise, when the provider searched around the place's city, the best
 *   specific result there is applied as an approximate pin, still marked
 *   needs_review so the user is asked to check it.
 * - Anything else keeps no coordinates and needs review.
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
    lodging: draft.lodging?.map((st) => ({ ...st })),
  }
  // Hotels are looked up like activity places; only a verified match is
  // copied back (a stay has no "needs review" state to flag a rough pin).
  const stayActs = (cloned.lodging ?? []).map(stayAsActivity)

  const targets: Target[] = []
  for (const day of cloned.days) {
    for (const act of day.activities) {
      if (act.type !== "location") continue
      if (act.lat != null && act.lng != null) continue
      const display = (act.location_name || act.title).trim()
      const name = (act.place_query || display).trim()
      if (!name) continue
      markNeedsReview(act)
      const key = `${day.day_number}:${targets.length}`
      const altName = display && display !== name ? display : undefined
      targets.push({ key, act, query: { key, name, altName, city: act.city?.trim() || undefined } })
    }
  }
  stayActs.forEach((act, i) => {
    if (act.lat != null && act.lng != null) return
    const name = (act.place_query || act.location_name).trim()
    if (!name) return
    markNeedsReview(act)
    const key = `stay:${i}`
    const altName = act.location_name && act.location_name !== name ? act.location_name : undefined
    targets.push({ key, act, query: { key, name, altName, city: act.city?.trim() || undefined } })
  })
  if (targets.length === 0) return cloned

  const local = await findInBatches(targets, (batch) => provider.findPlaceCandidates(batch, destination))
  const unresolved = targets.filter(({ key, act, query }) => {
    const candidates = local[key] ?? []
    const best = chooseBest(candidates, query, destination, act.category)
    if (best) {
      applyCandidate(act, best)
      return false
    }
    const approximate = chooseApproximate(candidates, query, destination, act.category)
    if (approximate) applyApproximate(act, approximate)
    return !approximate
  })

  // A specific airport/station may intentionally be outside the trip's main
  // destination. Permit a wider search only for a very close name.
  if (destination && unresolved.length > 0 && provider.findPlaceCandidatesGlobally) {
    const global = await findInBatches(unresolved, (batch) => provider.findPlaceCandidatesGlobally!(batch))
    for (const { key, act, query } of unresolved) {
      const best = chooseBest(global[key] ?? [], query, "", act.category, true)
      if (best) applyCandidate(act, best)
    }
  }

  stayActs.forEach((act, i) => {
    const st = cloned.lodging![i]
    if (act.location_verification !== "verified" || act.lat == null || act.lng == null) return
    st.lat = act.lat
    st.lng = act.lng
    st.address = act.address
    st.google_place_id = act.google_place_id
  })
  return cloned
}

function stayAsActivity(st: LodgingDraft): ActivityDraft {
  return {
    type: "location",
    title: st.name,
    start_time: "",
    end_time: "",
    location_name: st.location_name || st.name,
    place_query: st.place_query,
    city: st.city,
    address: st.address,
    lat: st.lat,
    lng: st.lng,
    google_place_id: st.google_place_id,
    category: "akomodasi",
    notes: "",
  }
}

/** Looks places up in batches; a failed batch leaves its places for review. */
async function findInBatches(
  targets: Target[],
  find: (batch: PlaceQuery[]) => Promise<Record<string, PlaceCandidate[]>>,
): Promise<Record<string, PlaceCandidate[]>> {
  const batches: PlaceQuery[][] = []
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    batches.push(targets.slice(i, i + BATCH_SIZE).map((t) => t.query))
  }
  const results = await Promise.all(
    batches.map((batch) =>
      find(batch).catch(() => ({}) as Record<string, PlaceCandidate[]>), // fail open
    ),
  )
  return Object.assign({}, ...results)
}

function markNeedsReview(act: ActivityDraft) {
  act.lat = null
  act.lng = null
  act.address = ""
  act.google_place_id = ""
  act.location_verification = "needs_review"
  act.location_confidence = null
}

/** The AI's display name is kept; the address shows the place found. */
function applyCandidate(act: ActivityDraft, match: ScoredCandidate) {
  const { candidate } = match
  act.location_name = act.location_name || candidate.name
  act.address = candidate.description
  act.lat = candidate.lat
  act.lng = candidate.lng
  act.google_place_id = candidate.externalId
  act.location_verification = "verified"
  act.location_confidence = Math.round(match.score * 100)
}

function applyApproximate(act: ActivityDraft, match: ScoredCandidate) {
  applyCandidate(act, match)
  act.location_verification = "needs_review"
}

function rank(candidates: PlaceCandidate[], query: PlaceQuery, destination: string, category: string) {
  return candidates
    .map((candidate) => scoreCandidate(candidate, query, destination, category))
    .sort((a, b) => b.score - a.score)
}

function chooseBest(
  candidates: PlaceCandidate[],
  query: PlaceQuery,
  destination: string,
  category: string,
  globalFallback = false,
): ScoredCandidate | null {
  const best = rank(candidates, query, destination, category)[0]
  if (!best) return null

  const minConfidence = globalFallback ? GLOBAL_CONFIDENCE : NORMAL_CONFIDENCE
  const minNameScore = globalFallback ? GLOBAL_NAME_SCORE : NORMAL_NAME_SCORE
  return best.score >= minConfidence && best.nameScore >= minNameScore ? best : null
}

/**
 * Best specific place found inside the place's city when no name matched
 * (OSM names often differ: "Prophet's Mosque" for "Al-Masjid an-Nabawi").
 * Ties keep the provider's order, which is already ranked by relevance.
 */
function chooseApproximate(
  candidates: PlaceCandidate[],
  query: PlaceQuery,
  destination: string,
  category: string,
): ScoredCandidate | null {
  const specific = candidates.filter(
    (c) => c.nearCity && !AREA_RESULT_TYPES.has(c.resultType ?? ""),
  )
  const scored = specific.map((candidate) => scoreCandidate(candidate, query, destination, category))
  if (scored.length === 0) return null
  return scored.reduce((best, next) => (next.nameScore > best.nameScore ? next : best))
}

export function scoreCandidate(
  candidate: PlaceCandidate,
  query: PlaceQuery | string,
  destination: string,
  category: string,
): ScoredCandidate {
  const q = typeof query === "string" ? { key: "", name: query } : query
  const nameScore = Math.max(
    weightedJaccard(q.name, candidate.name),
    q.altName ? weightedJaccard(q.altName, candidate.name) : 0,
  )
  const areaTokens = tokens(q.city || destination)
  const descriptionTokens = new Set(tokens(candidate.description))
  const areaScore = areaTokens.length === 0
    ? 0
    : areaTokens.filter((token) => descriptionTokens.has(token)).length / areaTokens.length
  const expectedTypes = CATEGORY_TYPES[normalize(category)] ?? []
  const categoryScore = expectedTypes.length > 0 && candidate.types?.some((type) => expectedTypes.includes(type))
    ? 1
    : 0

  const score = areaTokens.length > 0
    ? nameScore * 0.78 + areaScore * 0.17 + categoryScore * 0.05
    : nameScore * 0.94 + categoryScore * 0.06
  return { candidate, score, nameScore }
}
