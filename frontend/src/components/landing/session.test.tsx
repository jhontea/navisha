import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SessionCta } from "./SessionCta"
import { fetchHasSession, LandingSessionContext } from "./session"

afterEach(() => vi.unstubAllGlobals())

describe("fetchHasSession", () => {
  it("is true on 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))
    expect(await fetchHasSession()).toBe(true)
  })

  it("is false on 401 and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    expect(await fetchHasSession()).toBe(false)
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")))
    expect(await fetchHasSession()).toBe(false)
  })
})

describe("SessionCta", () => {
  const render = (signedIn: boolean, google: boolean) =>
    renderToStaticMarkup(
      <LandingSessionContext.Provider value={signedIn}>
        <SessionCta google={google} />
      </LandingSessionContext.Provider>,
    )

  it("signed out keeps the sign-in CTAs", () => {
    expect(render(false, true)).toContain("Continue with Google")
    expect(render(false, true)).toContain('href="/login"')
    expect(render(false, false)).toContain("Sign in")
  })

  it("signed in goes to the trips", () => {
    for (const google of [true, false]) {
      const html = render(true, google)
      expect(html).toContain("Go to my trips")
      expect(html).toContain('href="/trips"')
    }
  })
})
