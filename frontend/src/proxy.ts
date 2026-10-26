import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Fully public — no auth check at all
const OPEN_PATHS = ["/", "/privacy", "/terms", "/contact"]
// Public but redirect to /trips (home) if already logged in
const AUTH_PATHS = ["/login", "/auth/callback"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has("access_token")
  // The access cookie lives 30 min, the refresh cookie 7 days: after an idle half hour
  // only the refresh cookie is left, and the first API 401 renews the session.
  const hasSession = hasToken || request.cookies.has("refresh_token")

  if (OPEN_PATHS.includes(pathname) || pathname.startsWith("/share/")) {
    return NextResponse.next()
  }

  // The dashboard was merged into /trips (D3); keep old links working.
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/trips", request.url), 308)
  }

  if (AUTH_PATHS.includes(pathname)) {
    if (hasToken) {
      return NextResponse.redirect(new URL("/trips", request.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Exclude API proxy, Next.js internals, and any auto-generated icon assets
  // (favicon.ico, icon.svg, apple-icon, etc.) from auth checks so they are
  // served publicly even to unauthenticated visitors on the landing page.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|manifest\\.webmanifest).*)"],
}
