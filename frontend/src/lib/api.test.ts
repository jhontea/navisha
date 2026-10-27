import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, OFFLINE_MESSAGE, api, isOfflineError } from "./api"

const toastCalls = vi.hoisted(() => [] as string[])
vi.mock("./toast", () => ({
  toast: (message: string) => {
    toastCalls.push(message)
    return { dismiss: () => {} }
  },
}))

const fetchMock = vi.fn()

function setOnline(onLine: boolean) {
  vi.stubGlobal("navigator", { onLine })
}

describe("api offline guard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastCalls.length = 0
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    setOnline(true)
  })
  afterEach(() => {
    vi.advanceTimersByTime(10_000) // let the one-toast window close
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("refuses writes while offline without calling fetch, with one toast per burst", async () => {
    setOnline(false)
    const results = await Promise.allSettled([
      api.post("/trips", { name: "x" }),
      api.put("/trips/1", { name: "y" }),
      api.delete("/activities/1"),
    ])
    expect(fetchMock).not.toHaveBeenCalled()
    for (const r of results) {
      expect(r.status).toBe("rejected")
      expect(isOfflineError((r as PromiseRejectedResult).reason)).toBe(true)
    }
    expect(toastCalls).toEqual([OFFLINE_MESSAGE])
  })

  it("maps a network failure (TypeError) on a write to the same offline error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const err = await api.post("/trips/1/summary", {}).catch((e) => e)
    expect(isOfflineError(err)).toBe(true)
    expect(err).toBeInstanceOf(ApiError)
    expect(toastCalls).toEqual([OFFLINE_MESSAGE])
  })

  it("leaves reads, auth and location lookups alone", async () => {
    setOnline(false)
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    for (const call of [api.get("/trips"), api.post("/auth/logout"), api.post("/locations/link", { url: "u" })]) {
      const err = await call.catch((e) => e)
      expect(err).toBeInstanceOf(TypeError)
    }
    expect(toastCalls).toEqual([])
  })

  it("keeps server errors as they were", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: { code: "VALIDATION", message: "Name is required" } }), { status: 400 }),
    )
    const err = await api.post("/trips", {}).catch((e) => e)
    expect(isOfflineError(err)).toBe(false)
    expect(err).toMatchObject({ status: 400, code: "VALIDATION", message: "Name is required" })
    expect(toastCalls).toEqual([])
  })
})
