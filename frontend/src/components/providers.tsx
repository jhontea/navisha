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
  restorePersistedQueries,
  subscribeToQueryPersistence,
} from "@/lib/queryPersistence"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,        // 5 min — avoids cascade refetches
            gcTime: 10 * 60 * 1000,           // 10 min cache retention
            refetchOnWindowFocus: false,       // prevent tab-switch cascade
            refetchOnReconnect: false,         // iOS tab resume must not refetch every stale query
            refetchOnMount: true,              // stale queries refetch on navigation
            retry: 1,
          },
        },
      }),
  )
  const [isRestored, setIsRestored] = useState(false)

  useEffect(() => {
    let active = true
    void restorePersistedQueries(queryClient)
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsRestored(true)
      })
    return () => {
      active = false
    }
  }, [queryClient])

  useEffect(() => {
    if (!isRestored) return
    return subscribeToQueryPersistence(queryClient)
  }, [isRestored, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <IsRestoringProvider value={!isRestored}>
        {children}
      </IsRestoringProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
