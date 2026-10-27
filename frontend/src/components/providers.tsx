"use client"

// ═══════════════════════════════════════════════════════════════════════════
// QueryClient defaults — critical for preventing cascade refetches.
// staleTime: 5min prevents all queries going stale simultaneously.
// refetchOnWindowFocus: false prevents tab-switch API call storms.
// refetchOnMount: true (default) — stale queries refetch when navigating back
//   after a mutation invalidates them. Without this, mutations appear to have
//   no effect until the user reloads manually.
// DO NOT reduce staleTime below 5min or enable refetchOnWindowFocus.
// See: /memories/navisha-frontend-patterns.md

import {
  IsRestoringProvider,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useEffect, useState } from "react"
import {
  MAX_AGE_MS,
  restorePersistedQueries,
  subscribeToQueryPersistence,
} from "@/lib/queryPersistence"
import { useAuthStore } from "@/features/auth/store"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,        // 5 min — avoids cascade refetches
            gcTime: MAX_AGE_MS,               // keep unused trips for the offline snapshot (lib/queryPersistence)
            refetchOnWindowFocus: false,       // prevent tab-switch cascade
            refetchOnReconnect: false,         // iOS tab resume must not refetch every stale query
            refetchOnMount: true,              // stale queries refetch on navigation
            retry: 1,
          },
          // Run writes even when offline so api.ts refuses them with a message;
          // the default ("online") would pause them and send them on reconnect.
          mutations: { networkMode: "always" },
        },
      }),
  )
  const userID = useAuthStore((state) => state.user?.id ?? null)
  const [restoredUserID, setRestoredUserID] = useState<string | null>(null)
  // A different (or no) user: forget the previous restore before effects run,
  // so persistence never subscribes against another user's cache.
  const [prevUserID, setPrevUserID] = useState(userID)
  if (prevUserID !== userID) {
    setPrevUserID(userID)
    setRestoredUserID(null)
  }

  // Back online after a real offline spell: refresh what is on screen once.
  // refetchOnReconnect stays off because iOS fires "online" on every tab resume.
  useEffect(() => {
    let wentOffline = false
    const onOffline = () => (wentOffline = true)
    const onOnline = () => {
      if (!wentOffline) return
      wentOffline = false
      void queryClient.refetchQueries({ type: "active" })
    }
    window.addEventListener("offline", onOffline)
    window.addEventListener("online", onOnline)
    return () => {
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
    }
  }, [queryClient])

  useEffect(() => {
    if (!userID) return

    let active = true
    void restorePersistedQueries(queryClient, userID)
      .catch(() => undefined)
      .finally(() => {
        if (active) setRestoredUserID(userID)
      })
    return () => {
      active = false
    }
  }, [queryClient, userID])

  useEffect(() => {
    if (!userID || restoredUserID !== userID) return
    return subscribeToQueryPersistence(queryClient, userID)
  }, [queryClient, restoredUserID, userID])

  return (
    <QueryClientProvider client={queryClient}>
      <IsRestoringProvider value={Boolean(userID && restoredUserID !== userID)}>
        {children}
      </IsRestoringProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
