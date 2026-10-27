import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "./api"
import { UNDO_WINDOW_MS, flushPendingDeletes, scheduleDelete } from "./pendingDeletes"

type ToastCall = { message: string; kind?: string; action?: { label: string; onClick: () => void } }
// vi.mock and vi.hoisted run before the import above, so pendingDeletes gets this toast.
const toastCalls = vi.hoisted(() => [] as ToastCall[])
vi.mock("./toast", () => ({
  toast: (message: string, kind?: string, _ms?: number, action?: { label: string; onClick: () => void }) => {
    toastCalls.push({ message, kind, action })
    return { dismiss: () => {} }
  },
}))

describe("scheduleDelete", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastCalls.length = 0
    vi.stubGlobal("window", { setTimeout, clearTimeout, addEventListener: () => {} })
    vi.stubGlobal("document", { addEventListener: () => {}, visibilityState: "visible" })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("deletes only after the undo window and offers Undo", async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    scheduleDelete({ id: "a", message: "Expense deleted.", errorMessage: "x", commit })
    expect(toastCalls[0]).toMatchObject({ message: "Expense deleted.", action: { label: "Undo" } })
    expect(commit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it("Undo cancels the delete", async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    scheduleDelete({ id: "b", message: "Stay deleted.", errorMessage: "x", commit })
    toastCalls[0].action!.onClick()
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2)
    expect(commit).not.toHaveBeenCalled()
  })

  it("sends pending deletes at once when the page is hidden", async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    scheduleDelete({ id: "c", message: "Transport deleted.", errorMessage: "x", commit })
    flushPendingDeletes()
    expect(commit).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it("shows the error toast when the delete fails", async () => {
    const commit = vi.fn().mockRejectedValue(new Error("500"))
    scheduleDelete({ id: "d", message: "Activity deleted.", errorMessage: "Couldn't delete.", commit })
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)
    expect(toastCalls.at(-1)).toMatchObject({ message: "Couldn't delete.", kind: "error" })
  })

  it("offline: no generic error toast, only the offline one from api.ts", async () => {
    vi.stubGlobal("navigator", { onLine: false })
    const commit = () => api.delete("/activities/e")
    scheduleDelete({ id: "e", message: "Activity deleted.", errorMessage: "Couldn't delete.", commit })
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS)
    expect(toastCalls.map((t) => t.message)).toEqual(["Activity deleted.", "You're offline. Changes can't be saved right now."])
  })
})
