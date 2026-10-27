import { useSyncExternalStore } from "react"

// navigator.onLine, not TanStack's onlineManager: that one starts "online" on
// every page load and only flips on an online/offline event.
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/** Whether the browser thinks it has a connection (true during SSR). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}
