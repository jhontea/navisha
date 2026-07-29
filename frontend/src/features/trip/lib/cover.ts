import { DEFAULT_TRIP_COVERS } from "./coverCatalog"

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

const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
  "https://assets.navisha.cloud"
const R2_PUBLIC_ORIGIN = (() => {
  try {
    return new URL(R2_PUBLIC_URL).origin
  } catch {
    return "https://assets.navisha.cloud"
  }
})()
function stripR2ImageTransform(pathname: string): string {
  return pathname.replace(/^\/cdn-cgi\/image\/[^/]+/, "")
}

function getOptimizedR2Url(pathname: string, width: number): string {
  const sourcePath = stripR2ImageTransform(pathname)
  const normalizedPath = sourcePath.startsWith("/")
    ? sourcePath
    : `/${sourcePath}`
  const transform = `/cdn-cgi/image/width=${width},fit=cover,quality=75,format=auto`
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}${transform}${normalizedPath}`
}

function normalizeLocation(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Keep the matcher compatible with the project's current ES target.
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const COVER_BY_ALIAS = new Map<string, (typeof DEFAULT_TRIP_COVERS)[number]>()
let MAX_ALIAS_WORDS = 1

for (const cover of DEFAULT_TRIP_COVERS) {
  for (const alias of cover.aliases) {
    const normalizedAlias = normalizeLocation(alias)
    if (!normalizedAlias) continue

    COVER_BY_ALIAS.set(normalizedAlias, cover)
    MAX_ALIAS_WORDS = Math.max(MAX_ALIAS_WORDS, normalizedAlias.split(" ").length)
  }
}

function findCover(destination: string) {
  const tokens = normalizeLocation(destination).split(" ").filter(Boolean)
  let bestMatch:
    | { cover: (typeof DEFAULT_TRIP_COVERS)[number]; phraseLength: number }
    | undefined

  // Evaluate every matching phrase so explicit catalog priorities can resolve
  // cases such as a city cover versus its province cover.
  for (let phraseLength = MAX_ALIAS_WORDS; phraseLength >= 1; phraseLength -= 1) {
    for (let start = 0; start <= tokens.length - phraseLength; start += 1) {
      const phrase = tokens.slice(start, start + phraseLength).join(" ")
      const cover = COVER_BY_ALIAS.get(phrase)
      if (!cover) continue

      const isBetterMatch =
        !bestMatch ||
        (cover.priority ?? 0) > (bestMatch.cover.priority ?? 0) ||
        ((cover.priority ?? 0) === (bestMatch.cover.priority ?? 0) &&
          phraseLength > bestMatch.phraseLength)

      if (isBetterMatch) bestMatch = { cover, phraseLength }
    }
  }

  return bestMatch?.cover
}

/** Resolve a stable default cover for a destination when no custom cover exists. */
export function getDefaultTripCover(
  destination?: string,
  width = 1600,
): string {
  const match = destination ? findCover(destination) : undefined
  if (match) return getOptimizedR2Url(`/trip-covers/${match.filename}`, width)

  return ""
}

/** Prefer a saved/custom cover, then fall back to the destination template. */
export function resolveTripCover(
  coverImageUrl?: string | null,
  destination?: string | null,
  width = 1600,
): string {
  if (canRenderTripCover(coverImageUrl)) {
    const parsed = new URL(coverImageUrl)
    if (parsed.origin === R2_PUBLIC_ORIGIN) {
      return `${getOptimizedR2Url(parsed.pathname, width)}${parsed.search}${parsed.hash}`
    }
    return coverImageUrl
  }
  return getDefaultTripCover(destination ?? undefined, width)
}

/** Responsive variants are emitted only when the source supports R2 transforms. */
export function tripCoverSrcSet(
  coverImageUrl?: string | null,
  destination?: string | null,
  widths: number[] = [480, 768, 960, 1280, 1600],
): string | undefined {
  const variants = widths.map((width) => ({
    width,
    url: resolveTripCover(coverImageUrl, destination, width),
  }))
  if (!variants[0]?.url || new Set(variants.map(({ url }) => url)).size < 2) {
    return undefined
  }
  return variants.map(({ width, url }) => `${url} ${width}w`).join(", ")
}
