import { describe, expect, it } from "vitest"

import { cookieWantsDark, THEME_INIT_SCRIPT } from "./theme"

describe("cookieWantsDark", () => {
  it("is light by default", () => {
    expect(cookieWantsDark("")).toBe(false)
    expect(cookieWantsDark("csrf_token=abc")).toBe(false)
  })

  it("reads the dark choice anywhere in the cookie string", () => {
    expect(cookieWantsDark("navisha-theme=dark")).toBe(true)
    expect(cookieWantsDark("csrf_token=abc; navisha-theme=dark")).toBe(true)
    expect(cookieWantsDark("navisha-theme=dark; csrf_token=abc")).toBe(true)
  })

  it("ignores an explicit light choice and look-alike names", () => {
    expect(cookieWantsDark("navisha-theme=light")).toBe(false)
    expect(cookieWantsDark("old-navisha-theme=dark")).toBe(false)
    expect(cookieWantsDark("navisha-theme=darker")).toBe(false)
  })
})

describe("THEME_INIT_SCRIPT", () => {
  it("embeds the same matcher", () => {
    expect(THEME_INIT_SCRIPT).toContain("navisha-theme=dark")
    expect(() => new Function(THEME_INIT_SCRIPT)).not.toThrow()
  })
})
