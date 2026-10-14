"use client"

import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { CalendarDays, FileText, Map, Ticket, Wallet, type LucideIcon } from "lucide-react"

import { FloatingNav } from "@/components/FloatingNav"
import { TabPills } from "@/components/TabPills"
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
 * Trip section tabs (docs/DESIGN.md §4.3). From md up: TabPills overlapping
 * the trip cover and sticky under the top bar. On phones: the floating nav,
 * which replaces the global one inside a trip (one navigation at a time).
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

  const items = TABS.map((tab) => ({
    href: href(tab),
    label: tab.label,
    icon: tab.icon,
    active: isActive(tab),
    onIntent: () => prefetch(tab),
  }))

  return (
    <>
      {/* md+: pills that overlap the bottom edge of the trip cover, then stick under the top bar */}
      <div className="sticky top-16 z-30 -mt-7 hidden justify-center px-margin-desktop md:flex">
        <TabPills aria-label="Trip sections" items={items} />
      </div>

      {/* Phones: floating nav, replaces the global nav inside a trip */}
      <FloatingNav aria-label="Trip sections" items={items} />
    </>
  )
}
