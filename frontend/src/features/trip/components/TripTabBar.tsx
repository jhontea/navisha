"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { CalendarDays, FileText, Map, Ticket, Wallet, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { accommodationApi } from "@/features/accommodation/api"
import { expenseApi } from "@/features/expense/api"
import { transportationApi } from "@/features/transportation/api"
import { tripApi } from "@/features/trip/api"

type Tab = { label: string; segment: string; icon: LucideIcon }

// D3 trip sections. Overview lives as a panel above the Itinerary;
// Transport + Stay are Bookings.
const TABS: Tab[] = [
  { label: "Itinerary", segment: "", icon: CalendarDays },
  { label: "Map", segment: "map", icon: Map },
  { label: "Bookings", segment: "bookings", icon: Ticket },
  { label: "Budget", segment: "budget", icon: Wallet },
  { label: "Summary", segment: "summary", icon: FileText },
]

/**
 * Trip section tabs. On phones this is the bottom bar and replaces the global
 * nav (one navigation bar at a time); from md up it is a sticky tab row under
 * the top bar.
 */
export function TripTabBar({ tripId }: { tripId: string }) {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const href = (tab: Tab) => (tab.segment ? `/trips/${tripId}/${tab.segment}` : `/trips/${tripId}`)
  const isActive = (tab: Tab) =>
    tab.segment ? pathname.startsWith(`/trips/${tripId}/${tab.segment}`) : pathname === `/trips/${tripId}`

  function prefetch(tab: Tab) {
    void queryClient.prefetchQuery({
      queryKey: ["trips", "detail", tripId],
      queryFn: () => tripApi.get(tripId),
    })
    if (tab.segment === "bookings") {
      void queryClient.prefetchQuery({
        queryKey: ["transportations", "list", tripId],
        queryFn: () => transportationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
      void queryClient.prefetchQuery({
        queryKey: ["accommodations", "list", tripId],
        queryFn: () => accommodationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
    }
    if (tab.segment === "budget") {
      void queryClient.prefetchQuery({
        queryKey: ["expenses", "list", tripId],
        queryFn: () => expenseApi.list(tripId),
      })
      void queryClient.prefetchQuery({
        queryKey: ["expenses", "summary", tripId],
        queryFn: () => expenseApi.summary(tripId),
        staleTime: 5 * 60 * 1000,
      })
    }
  }

  return (
    <>
      {/* md+: sticky tab row */}
      <nav
        className="sticky top-14 z-30 hidden border-b bg-background/95 backdrop-blur md:block"
        aria-label="Trip sections"
      >
        <ul className="mx-auto flex w-full max-w-max-width gap-1 px-margin-desktop">
          {TABS.map((tab) => {
            const active = isActive(tab)
            return (
              <li key={tab.label}>
                <Link
                  href={href(tab)}
                  prefetch={false}
                  onMouseEnter={() => prefetch(tab)}
                  onFocus={() => prefetch(tab)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Phones: bottom bar, replaces the global nav inside a trip */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Trip sections"
      >
        <ul className="flex items-stretch">
          {TABS.map((tab) => {
            const active = isActive(tab)
            return (
              <li key={tab.label} className="flex-1">
                <Link
                  href={href(tab)}
                  prefetch={false}
                  onTouchStart={() => prefetch(tab)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <tab.icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  <span className="leading-none">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
