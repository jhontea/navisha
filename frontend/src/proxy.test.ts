import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { proxy } from "./proxy"

function run(path: string, cookies: string[] = []) {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookies.length ? { cookie: cookies.map((c) => `${c}=x`).join("; ") } : undefined,
  })
  return proxy(req).headers.get("location")
}

describe("proxy auth redirects", () => {
  it("sends visitors with no session cookie to /login", () => {
    expect(run("/trips")).toBe("http://localhost:3000/login")
  })

  it("lets a protected page through on the refresh cookie alone (idle past the access TTL)", () => {
    expect(run("/trips", ["refresh_token"])).toBeNull()
  })

  it("keeps /login reachable with only a refresh cookie, so a failed refresh cannot loop", () => {
    expect(run("/login", ["refresh_token"])).toBeNull()
  })

  it("moves signed-in visitors off /login", () => {
    expect(run("/login", ["access_token", "refresh_token"])).toBe("http://localhost:3000/trips")
  })
})
