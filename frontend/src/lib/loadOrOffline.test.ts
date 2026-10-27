import { afterEach, describe, expect, it, vi } from "vitest"

import { loadOrOffline } from "./loadOrOffline"

describe("loadOrOffline", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns the loaded component", async () => {
    const Form = () => null
    expect(await loadOrOffline(() => Promise.resolve(Form))).toBe(Form)
  })

  it("offline: returns a 'needs a connection' component instead of rejecting", async () => {
    vi.stubGlobal("navigator", { onLine: false })
    const C = await loadOrOffline(() => Promise.reject(new Error("ChunkLoadError")))
    expect(C.name).toBe("NeedsConnection")
  })

  it("online: keeps rejecting so the page error boundary handles it", async () => {
    vi.stubGlobal("navigator", { onLine: true })
    await expect(loadOrOffline(() => Promise.reject(new Error("ChunkLoadError")))).rejects.toThrow("ChunkLoadError")
  })
})
