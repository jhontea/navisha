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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,        // 5 min — avoids cascade refetches
            gcTime: 10 * 60 * 1000,           // 10 min cache retention
            refetchOnWindowFocus: false,       // prevent tab-switch cascade
            refetchOnMount: true,              // stale queries refetch on navigation
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
