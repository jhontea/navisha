"use client"

import { useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
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
    }
  }, [query.isSuccess, query.isError, query.data, setUser, setLoading])

  return {
    user,
    isLoading: query.isLoading || isLoading,
    isAuthenticated: !!user,
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      setUser(null)
      queryClient.clear()
      router.push("/login")
    },
  })
}

/**
 * Silently refreshes the access token while the user is active on the page.
 * Uses activity events (mousemove, keydown, click, scroll) to track last
 * interaction time. Only calls /auth/refresh when the user has been active
 * within INACTIVITY_THRESHOLD_MS. Stops refreshing once the tab is inactive
 * so the token can naturally expire in the background.
 *
 * Mount this once in the dashboard layout.
 */
export function useTokenRefresh() {
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    // Track user activity
    const onActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))

    // Periodic refresh
    const interval = setInterval(async () => {
      const idle = Date.now() - lastActivityRef.current
      if (idle > INACTIVITY_THRESHOLD_MS) {
        // User inactive — skip refresh, let token expire naturally
        return
      }
      try {
        await api.post("/auth/refresh")
      } catch {
        // Refresh failed (token already expired or network error).
        // The next API call will return 401 and the middleware will
        // redirect to /login automatically.
      }
    }, REFRESH_INTERVAL_MS)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
      clearInterval(interval)
    }
  }, [])
}
