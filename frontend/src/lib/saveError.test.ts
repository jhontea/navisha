import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, api } from "./api"
import { SAVE_ERROR_MESSAGE, saveErrorMessage } from "./saveError"

vi.mock("./toast", () => ({ toast: () => ({ dismiss: () => {} }) }))

describe("saveErrorMessage", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns null for an offline refusal (api.ts already toasted)", async () => {
    vi.stubGlobal("navigator", { onLine: false })
    const err = await api.post("/trips", {}).catch((e: unknown) => e)
    expect(saveErrorMessage(err)).toBeNull()
  })

  it("shows the server message for a 4xx", () => {
    expect(saveErrorMessage(new ApiError(422, "VALIDATION", "Title is required"))).toBe("Title is required")
  })

  it("returns null for an expired session or an intentional logout", () => {
    expect(saveErrorMessage(new ApiError(401, "UNAUTHORIZED", "invalid token"))).toBeNull()
    expect(saveErrorMessage(new ApiError(0, "LOGGING_OUT", "Session ending"))).toBeNull()
  })

  it("shows the generic message for a 5xx", () => {
    expect(saveErrorMessage(new ApiError(500, "INTERNAL", "boom"))).toBe(SAVE_ERROR_MESSAGE)
  })

  it("shows the generic message for a non-API error", () => {
    expect(saveErrorMessage(new TypeError("Failed to fetch"))).toBe(SAVE_ERROR_MESSAGE)
    expect(saveErrorMessage("weird")).toBe(SAVE_ERROR_MESSAGE)
  })
})
