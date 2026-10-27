"use client"

import { useEffect } from "react"

/**
 * Downloads a lazily loaded module (e.g. a form behind next/dynamic) once the
 * page is idle, so the first open of its sheet shows the form instead of a
 * loading placeholder. Skipped offline and when the user asked to save data.
 */
export function usePrefetchOnIdle(load: () => Promise<unknown>) {
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) return
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData) return
    const run = () => void load().catch(() => {})
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 1500)
    return () => clearTimeout(id)
    // The loader is a module import; running it once per mount is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
