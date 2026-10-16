import { beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.fn()
vi.mock("@/lib/api", () => ({ api: { get: (...args: unknown[]) => get(...args) } }))

import { searchLocationSuggestions } from "./api"

describe("searchLocationSuggestions", () => {
  beforeEach(() => get.mockReset())

  it("sends the trip destination as `near` so the backend can bias results", () => {
    searchLocationSuggestions("playground ancol", "place", undefined, "Jakarta, Indonesia")
    expect(get).toHaveBeenCalledWith("/locations/autocomplete", {
      params: { query: "playground ancol", kind: "place", lang: "en", near: "Jakarta, Indonesia" },
      signal: undefined,
    })
  })

  it("leaves `near` out without a destination", () => {
    searchLocationSuggestions("Jakarta", "region")
    expect(get.mock.calls[0][1].params).toEqual({ query: "Jakarta", kind: "region", lang: "en" })
  })
})
