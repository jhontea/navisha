/**
 * Provider-neutral helpers to compare an intended place name (from the AI or
 * the user) with a search result. Shared by every location provider.
 */

/** A search result that can be applied to an activity. */
export interface PlaceCandidate {
  name: string
  description: string
  lat: number
  lng: number
  externalId: string
  /** Provider place types (Google), used as a weak category signal. */
  types?: string[]
  /** Provider result kind (Geoapify: amenity, building, street, city, ...). */
  resultType?: string
  /** True when the provider searched only around the place's city. */
  nearCity?: boolean
}

const STOP_WORDS = new Set([
  "a", "at", "dan", "dari", "di", "explore", "in", "jalan", "ke",
  "makan", "ngopi", "the", "to", "visit", "visiting",
])

const GENERIC_PLACE_WORDS = new Set([
  "airport", "bandara", "bar", "cafe", "coffee", "eatery", "food", "hotel",
  "market", "mall", "museum", "park", "restaurant", "restoran", "shop",
  "station", "stasiun", "store", "temple",
])

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** US spellings folded onto the UK one so "Food Center" matches "Food Centre". */
const SPELLING_VARIANTS: Record<string, string> = { center: "centre" }

export function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .map((token) => SPELLING_VARIANTS[token] ?? token)
}

/**
 * Token overlap between two names (0..1). Generic words such as "cafe" or
 * "museum" count for less, so the distinctive part of a name decides.
 */
export function weightedJaccard(left: string, right: string): number {
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

/**
 * Which autocomplete predictions are worth a Place Details call. Details are
 * the costly, Pro-tier request, so only the prediction whose name best
 * matches is fetched — plus the runners-up that tie with it (up to `max`),
 * when the name alone cannot tell them apart.
 */
export function pickForDetails<T>(
  predictions: T[],
  intendedName: string,
  label: (prediction: T) => string,
  max = 2,
): T[] {
  const scored = predictions
    .map((prediction) => ({ prediction, score: weightedJaccard(intendedName, label(prediction)) }))
    .sort((a, b) => b.score - a.score)
  if (scored.length === 0) return []
  const best = scored[0].score
  return scored
    .filter((s) => s.score === best)
    .slice(0, max)
    .map((s) => s.prediction)
}
