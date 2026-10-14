import { describe, expect, it } from "vitest"

import { scrubUrl } from "./errorReporting"

describe("scrubUrl", () => {
  it("hides share-link tokens", () => {
    expect(scrubUrl("https://navisha.cloud/share/abc.DEF-123?x=1")).toBe("https://navisha.cloud/share/[token]?x=1")
    expect(scrubUrl("/share/abc#top")).toBe("/share/[token]#top")
  })

  it("leaves other URLs alone", () => {
    expect(scrubUrl("https://navisha.cloud/trips/123/budget")).toBe("https://navisha.cloud/trips/123/budget")
  })
})
