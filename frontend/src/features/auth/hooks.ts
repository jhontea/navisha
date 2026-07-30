"use client"

import { useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api, ApiError, setLoggingOut } from "@/lib/api"
import { clearPersistedQueries } from "@/lib/queryPersistence"
import { useAuthStore } from "./store"
import type { User } from "./types"

// How often to attempt a token refresh while the tab is active (ms)
const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
// Consider the user "inactive" after this many ms without interaction
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  const query = useQuery<User, ApiError>({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.isSuccess) {
      setUser(query.data)
      setLoading(false)
    } else if (query.isError) {
      setUser(null)
      setLoading(false)
      void clearPersistedQueries()
    }
  }, [query.isSuccess, query.isError, query.data, setUser, setLoading])

  // TanStack Query already has the freshest value during render. Prefer it
  // over waiting one extra render for the Zustand synchronization effect.
  const resolvedUser = query.isSuccess ? query.data : query.isError ? null : user
  const authIsLoading =
    !resolvedUser && !query.isError && (query.isLoading || isLoading)

  return {
    user: resolvedUser,
    isLoading: authIsLoading,
    isAuthenticated: !!resolvedUser,
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      // Mark intentional logout so any in-flight background request that 401s
      // after the server clears cookies won't trigger the toast + redirect.
      setLoggingOut(true)
      return api.post("/auth/logout")
    },
    onSuccess: async () => {
      // Cancel in-flight queries *first* so their abort signals fire and stop
      // background fetches (e.g. /trips list, /auth/me) before the cookie is
      // gone — otherwise those fetches 401 and pollute the console. `clear()`
      // alone sends a `destroy` notification that doesn't abort the network.
      await queryClient.cancelQueries()
      setUser(null)
      queryClient.clear()
      await clearPersistedQueries()
      router.push("/login")
    },
  })
}

/**
 * Silently refreshes the access token while the user is active on the page.
 * Uses low-frequency pointer/keyboard activity to track the active session.
 * Refresh pauses while the document is hidden and resumes at most once when
 * iOS restores the tab, avoiding scroll listeners and reconnect request storms.
 *
 * Note: if this proactive refresh is missed and the access token expires,
 * lib/api.ts also performs an on-demand refresh-and-retry on any 401
 * before bouncing the user to /login?reason=session-expired. This hook
 * only runs on the client — it does NOT cover server-side `middleware.ts`
 * route checks, which still rely on the cookie alone.
 *
 * Mount this once in the dashboard layout.
 */
export function useTokenRefresh() {
  const lastActivityRef = useRef<number>(Date.now())
  const lastAttemptRef = useRef<number>(Date.now())
  const refreshInFlightRef = useRef(false)

  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const refreshIfActive = async () => {
      if (document.visibilityState !== "visible" || refreshInFlightRef.current) return
      const idle = Date.now() - lastActivityRef.current
      if (idle > INACTIVITY_THRESHOLD_MS) return

      lastAttemptRef.current = Date.now()
      refreshInFlightRef.current = true
      try {
        await api.post("/auth/refresh")
      } catch {
        // Refresh failed (token already expired, network error, or refresh
        // cookie gone). lib/api.ts will surface this on the next 401 by
        // redirecting to /login?reason=session-expired.
      } finally {
        refreshInFlightRef.current = false
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      onActivity()
      if (Date.now() - lastAttemptRef.current >= REFRESH_INTERVAL_MS) {
        void refreshIfActive()
      }
    }

    // pointerdown covers touch and mouse without running on every scroll frame.
    window.addEventListener("pointerdown", onActivity, { passive: true })
    window.addEventListener("keydown", onActivity)
    document.addEventListener("visibilitychange", onVisibilityChange)
    const interval = window.setInterval(() => {
      void refreshIfActive()
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.removeEventListener("pointerdown", onActivity)
      window.removeEventListener("keydown", onActivity)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [])
}
