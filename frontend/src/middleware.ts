import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Fully public — no auth check at all
const OPEN_PATHS = ["/"]
// Public but redirect to /dashboard if already logged in
const AUTH_PATHS = ["/login", "/auth/callback"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has("access_token")

  if (OPEN_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  if (AUTH_PATHS.includes(pathname)) {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!hasToken) {
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
