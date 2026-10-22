"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { API_BASE } from "@/lib/api"

/**
 * Whether the visitor has a live session. A plain fetch, not lib/api: its 401
 * handler would toast and bounce a logged-out visitor to /login. Any failure,
 * an expired token included, just means "show the sign-in CTA".
 */
export async function fetchHasSession(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include", cache: "no-store", signal })
    return res.ok
  } catch {
    return false
  }
}

const SessionContext = createContext(false)
export const LandingSessionContext = SessionContext

/** One /auth/me request per landing page, shared by every CTA below. */
export function LandingSessionProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetchHasSession(controller.signal).then((ok) => {
      if (!controller.signal.aborted) setSignedIn(ok)
    })
    return () => controller.abort()
  }, [])

  return <SessionContext.Provider value={signedIn}>{children}</SessionContext.Provider>
}

export const useLandingSignedIn = () => useContext(SessionContext)
