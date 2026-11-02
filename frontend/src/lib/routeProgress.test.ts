import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ROUTE_PROGRESS_START, ROUTE_PROGRESS_TIMEOUT_MS, watchRouteProgress } from "./routeProgress"

describe("watchRouteProgress", () => {
  const target = new EventTarget()
  const start = () => target.dispatchEvent(new Event(ROUTE_PROGRESS_START))
  let onStart: ReturnType<typeof vi.fn<() => void>>
  let onTimeout: ReturnType<typeof vi.fn<() => void>>
  let watch: ReturnType<typeof watchRouteProgress>

  beforeEach(() => {
    vi.useFakeTimers()
    onStart = vi.fn<() => void>()
    onTimeout = vi.fn<() => void>()
    watch = watchRouteProgress(target, onStart, onTimeout)
  })

  afterEach(() => {
    watch.stop()
    vi.useRealTimers()
  })

  it("gives up after the timeout when the route never changes", () => {
    start()
    expect(onStart).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(ROUTE_PROGRESS_TIMEOUT_MS - 1)
    expect(onTimeout).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it("does not time out once done() is called", () => {
    start()
    watch.done()
    vi.advanceTimersByTime(ROUTE_PROGRESS_TIMEOUT_MS * 2)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it("restarts the timeout on a second start", () => {
    start()
    vi.advanceTimersByTime(ROUTE_PROGRESS_TIMEOUT_MS - 100)
    start()
    vi.advanceTimersByTime(ROUTE_PROGRESS_TIMEOUT_MS - 100)
    expect(onTimeout).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it("ignores events after stop()", () => {
    watch.stop()
    start()
    vi.advanceTimersByTime(ROUTE_PROGRESS_TIMEOUT_MS)
    expect(onStart).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
