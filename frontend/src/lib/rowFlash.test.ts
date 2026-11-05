import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { FLASH_FADE_MS, FLASH_ON_MS, flashRow } from "./rowFlash"

function fakeRow(exiting = false) {
  const attrs = new Map<string, string>()
  return {
    closest: (sel: string) => (exiting && sel === "[data-exiting]" ? {} : null),
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
    flash: () => attrs.get("data-flash"),
    scrollIntoView: vi.fn(),
  }
}

describe("flashRow", () => {
  let rows: Record<string, ReturnType<typeof fakeRow>>
  // Copies earlier in the DOM than rows[id], e.g. one animating out.
  let before: Record<string, ReturnType<typeof fakeRow>[]>

  beforeEach(() => {
    vi.useFakeTimers()
    rows = {}
    before = {}
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 16))
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) })
    vi.stubGlobal("document", {
      querySelectorAll: (sel: string) => {
        const id = /data-row-id="(.+)"/.exec(sel)![1]
        return [...(before[id] ?? []), ...(rows[id] ? [rows[id]] : [])]
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("tints the row, fades after 1000ms, then clears", () => {
    const row = (rows.a = fakeRow())
    flashRow("a")
    vi.advanceTimersByTime(16)
    expect(row.flash()).toBe("on")
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" })
    vi.advanceTimersByTime(FLASH_ON_MS - 1)
    expect(row.flash()).toBe("on")
    vi.advanceTimersByTime(1)
    expect(row.flash()).toBe("off")
    vi.advanceTimersByTime(FLASH_FADE_MS)
    expect(row.flash()).toBeUndefined()
  })

  it("skips a copy that is animating out and flashes the live row", () => {
    const old = fakeRow(true)
    before.a = [old]
    const row = (rows.a = fakeRow())
    flashRow("a")
    vi.advanceTimersByTime(16)
    expect(old.flash()).toBeUndefined()
    expect(row.flash()).toBe("on")
  })

  it("re-flashing during the fade turns it back on and restarts the 1000ms", () => {
    const row = (rows.a = fakeRow())
    flashRow("a")
    vi.advanceTimersByTime(16 + FLASH_ON_MS + 100)
    expect(row.flash()).toBe("off")
    flashRow("a")
    vi.advanceTimersByTime(16)
    expect(row.flash()).toBe("on")
    vi.advanceTimersByTime(FLASH_ON_MS - 1)
    expect(row.flash()).toBe("on")
    vi.advanceTimersByTime(1 + FLASH_FADE_MS)
    expect(row.flash()).toBeUndefined()
  })

  it("waits for a row that renders later, and gives up after 2s", () => {
    flashRow("late")
    vi.advanceTimersByTime(500)
    const row = (rows.late = fakeRow())
    vi.advanceTimersByTime(16)
    expect(row.flash()).toBe("on")

    flashRow("never")
    vi.advanceTimersByTime(2100)
    rows.never = fakeRow()
    vi.advanceTimersByTime(100)
    expect(rows.never.flash()).toBeUndefined()
  })

  it("scrolls without smoothing under reduced motion", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) })
    const row = (rows.a = fakeRow())
    flashRow("a")
    vi.advanceTimersByTime(16)
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" })
  })
})
