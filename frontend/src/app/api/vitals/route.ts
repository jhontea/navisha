import { NextResponse } from "next/server"

const VITAL_NAMES = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"])
const RATINGS = new Set(["good", "needs-improvement", "poor"])
const PLATFORMS = new Set(["ios", "android", "desktop"])
const BROWSERS = new Set(["safari", "crios", "fxios", "chrome", "edge", "other"])
const DEVICE_CLASSES = new Set(["touch", "desktop"])

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 2048) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  if (
    typeof body.id !== "string" ||
    typeof body.name !== "string" ||
    !VITAL_NAMES.has(body.name) ||
    typeof body.value !== "number" ||
    !Number.isFinite(body.value) ||
    typeof body.delta !== "number" ||
    !Number.isFinite(body.delta) ||
    typeof body.rating !== "string" ||
    !RATINGS.has(body.rating) ||
    typeof body.route !== "string" ||
    body.route.length > 200
  ) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 })
  }

  console.info(JSON.stringify({
    event: "web_vital",
    id: body.id.slice(0, 100),
    name: body.name,
    value: body.value,
    delta: body.delta,
    rating: body.rating,
    navigation_type:
      typeof body.navigation_type === "string"
        ? body.navigation_type.slice(0, 50)
        : "unknown",
    route: body.route,
    platform:
      typeof body.platform === "string" && PLATFORMS.has(body.platform)
        ? body.platform
        : "unknown",
    browser:
      typeof body.browser === "string" && BROWSERS.has(body.browser)
        ? body.browser
        : "unknown",
    device_class:
      typeof body.device_class === "string" && DEVICE_CLASSES.has(body.device_class)
        ? body.device_class
        : "unknown",
  }))

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  })
}
