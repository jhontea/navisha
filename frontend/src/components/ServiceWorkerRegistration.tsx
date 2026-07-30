"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Service workers may be unavailable in Safari private mode. Static
        // assets continue to use the normal HTTP cache in that case.
      })
    }

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(register, { timeout: 3000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timer = globalThis.setTimeout(register, 1500)
    return () => globalThis.clearTimeout(timer)
  }, [])

  return null
}
