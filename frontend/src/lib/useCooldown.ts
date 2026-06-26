"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface CooldownState {
  /** Seconds remaining until cooldown expires. 0 = not cooling down. */
  remaining: number
  /** Start a cooldown for the given number of seconds. */
  startCooldown: (seconds: number) => void
  /** Clear cooldown immediately. */
  clearCooldown: () => void
}

/**
 * Client-side cooldown timer for rate-limited actions (AI generate, summary).
 * Reads retry_after_seconds from 429 API errors and counts down.
 * The cooldown is stored in sessionStorage so it survives page refreshes.
 */
export function useCooldown(key: string): CooldownState {
  const storageKey = `cooldown:${key}`
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [remaining, setRemaining] = useState(0)

  // Read initial cooldown from storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const expiresAt = parseInt(stored, 10)
      const now = Date.now()
      const secs = Math.max(0, Math.ceil((expiresAt - now) / 1000))
      if (secs > 0) {
        setRemaining(secs)
      } else {
        sessionStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  // Countdown interval
  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          sessionStorage.removeItem(storageKey)
          return 0
        }
        return next
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [remaining, storageKey])

  const startCooldown = useCallback(
    (seconds: number) => {
      const expiresAt = Date.now() + seconds * 1000
      sessionStorage.setItem(storageKey, String(expiresAt))
      setRemaining(seconds)
    },
    [storageKey],
  )

  const clearCooldown = useCallback(() => {
    sessionStorage.removeItem(storageKey)
    setRemaining(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [storageKey])

  return { remaining, startCooldown, clearCooldown }
}
