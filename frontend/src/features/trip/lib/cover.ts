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
const LEGACY_R2_PUBLIC_ORIGIN =
  "https://pub-747dca221fc941d5bc8ab8099b318a8e.r2.dev"
const R2_IMAGE_TRANSFORM =
  "/cdn-cgi/image/width=1600,fit=cover,quality=75,format=auto"

function getOptimizedR2Url(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`

  if (normalizedPath.startsWith(`${R2_IMAGE_TRANSFORM}/`)) {
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}${normalizedPath}`
  }

  return `${R2_PUBLIC_URL.replace(/\/$/, "")}${R2_IMAGE_TRANSFORM}${normalizedPath}`
}

const DEFAULT_TRIP_COVERS = [
  { keywords: ["tokyo"], filename: "navisha-tokyo.png" },
  { keywords: ["osaka"], filename: "navisha-osaka.png" },
  { keywords: ["kyoto"], filename: "navisha-kyoto.png" },
  { keywords: ["jakarta"], filename: "navisha-jakarta.png" },
  { keywords: ["bali"], filename: "navisha-bali.png" },
  { keywords: ["bogor"], filename: "navisha-bogor.png" },
  { keywords: ["lampung"], filename: "navisha-lampung.png" },
  { keywords: ["majalengka"], filename: "navisha-majalengka.png" },
  { keywords: ["cirebon"], filename: "navisha-cirebon.png" },
  { keywords: ["bandung"], filename: "navisha-bandung.png" },
  { keywords: ["tangerang"], filename: "navisha-tangerang.png" },
  { keywords: ["kuningan"], filename: "navisha-kuningan.png" },
  { keywords: ["semarang"], filename: "navisha-semarang.png" },
]

/** Resolve a stable default cover for a destination when no custom cover exists. */
export function getDefaultTripCover(destination?: string): string {
  const normalized = destination
    ?.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

  if (normalized) {
    const match = DEFAULT_TRIP_COVERS.find(({ keywords }) =>
      keywords.some((keyword) =>
        new RegExp(`(^|[\\s,/-])${keyword}($|[\\s,/-])`).test(normalized),
      ),
    )

    if (match) return getOptimizedR2Url(`/trip-covers/${match.filename}`)
  }

  return ""
}

/** Prefer a saved/custom cover, then fall back to the destination template. */
export function resolveTripCover(
  coverImageUrl?: string | null,
  destination?: string | null,
): string {
  if (canRenderTripCover(coverImageUrl)) {
    const parsed = new URL(coverImageUrl)
    if (parsed.origin === LEGACY_R2_PUBLIC_ORIGIN) {
      return `${getOptimizedR2Url(parsed.pathname)}${parsed.search}${parsed.hash}`
    }
    if (parsed.origin === R2_PUBLIC_ORIGIN) {
      return `${getOptimizedR2Url(parsed.pathname)}${parsed.search}${parsed.hash}`
    }
    return coverImageUrl
  }
  return getDefaultTripCover(destination ?? undefined)
}