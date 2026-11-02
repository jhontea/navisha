export const ROUTE_PROGRESS_START = "route-progress:start"
export const ROUTE_PROGRESS_TIMEOUT_MS = 10_000

// Call one line before router.push so <RouteProgress> shows its bar (it only sees link clicks itself).
export function startRouteProgress() {
  window.dispatchEvent(new Event(ROUTE_PROGRESS_START))
}

// Calls onStart for every start event and onTimeout when done() is not called within timeoutMs,
// so a push that fails or stays on the same path cannot leave the bar hanging.
export function watchRouteProgress(
  target: EventTarget,
  onStart: () => void,
  onTimeout: () => void,
  timeoutMs = ROUTE_PROGRESS_TIMEOUT_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const onEvent = () => {
    clearTimeout(timer)
    onStart()
    timer = setTimeout(onTimeout, timeoutMs)
  }
  target.addEventListener(ROUTE_PROGRESS_START, onEvent)
  return {
    done: () => clearTimeout(timer),
    stop: () => {
      clearTimeout(timer)
      target.removeEventListener(ROUTE_PROGRESS_START, onEvent)
    },
  }
}
