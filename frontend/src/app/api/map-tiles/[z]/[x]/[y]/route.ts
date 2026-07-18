import { NextResponse } from "next/server"

const UPSTREAM_TEMPLATE =
  process.env.MAP_TILE_UPSTREAM_URL ||
  "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"

const TILE_COORDINATE = /^\d+$/

export async function GET(
  _request: Request,
  { params }: { params: { z: string; x: string; y: string } },
) {
  const { z, x, y } = params
  if (![z, x, y].every((value) => TILE_COORDINATE.test(value))) {
    return NextResponse.json({ message: "Invalid tile coordinates" }, { status: 400 })
  }

  const upstreamUrl = UPSTREAM_TEMPLATE.replace("{z}", z)
    .replace("{x}", x)
    .replace("{y}", y)

  try {
    const response = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Navisha/1.0" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control":
          response.headers.get("cache-control") || "public, max-age=86400",
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
