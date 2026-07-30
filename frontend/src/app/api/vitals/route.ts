import { NextResponse } from "next/server"

const VITAL_NAMES = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"])
const RATINGS = new Set(["good", "needs-improvement", "poor"])
const PLATFORMS = new Set(["ios", "android", "desktop"])
const BROWSERS = new Set(["safari", "crios", "fxios", "chrome", "edge", "other"])
const DEVICE_CLASSES = new Set(["touch", "desktop"])

export const dynamic = "force-dynamic"

interface ValidatedMetric extends Record<string, unknown> {
  id: string
  name: string
  value: number
  delta: number
  rating: string
  route: string
}

function isValidMetric(body: unknown): body is ValidatedMetric {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false
  const metric = body as Record<string, unknown>
  return (
    typeof metric.id === "string" &&
    typeof metric.name === "string" &&
    VITAL_NAMES.has(metric.name) &&
    typeof metric.value === "number" &&
    Number.isFinite(metric.value) &&
    typeof metric.delta === "number" &&
    Number.isFinite(metric.delta) &&
    typeof metric.rating === "string" &&
    RATINGS.has(metric.rating) &&
    typeof metric.route === "string" &&
    metric.route.length <= 200
  )
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 8192) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  const metrics = Array.isArray(payload) ? payload : [payload]
  if (metrics.length === 0 || metrics.length > 10 || !metrics.every(isValidMetric)) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 })
  }

  for (const body of metrics) {
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
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  })
}
