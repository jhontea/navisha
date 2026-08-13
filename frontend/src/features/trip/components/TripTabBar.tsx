"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Calendar, Map, DollarSign, Bus, Hotel } from "lucide-react"
import { accommodationApi } from "@/features/accommodation/api"
import { expenseApi } from "@/features/expense/api"
import { transportationApi } from "@/features/transportation/api"
import { tripApi } from "@/features/trip/api"
import { tripOverviewApi, tripOverviewKey } from "@/features/trip/overview"

interface TripTabBarProps {
  tripId: string
}

const TABS = [
  { label: "Overview",  href: "overview",   icon: Map,         key: "overview"   },
  { label: "Itinerary", href: "",            icon: Calendar,    key: "itinerary"  },
  { label: "Transport", href: "transport",   icon: Bus,         key: "transport"  },
  { label: "Stay",      href: "stay",        icon: Hotel,       key: "stay"       },
  { label: "Budget",    href: "budget",      icon: DollarSign,  key: "budget"     },
] as const

/**
 * Tab bar for trip detail sub-pages.
 * Iter 46 — sticky below TopBar (top offset matches TopBar height)
 * Iter 47 — active: gradient underline pill, not just color
 * Iter 48 — icons on all tabs (not just mobile)
 * Iter 49 — scrollable on mobile with snap
 * Iter 50 — hide label on xs, show on sm+
 * Iter 51 — mobile: stacked icon+label, larger icons, full-width even spacing (scroll fallback)
 * Iter 52 — active state: fixed-width underline indicator + constant icon stroke; equal-width tabs on mobile
 */
export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  function tabHref(tab: (typeof TABS)[number]) {
    return tab.href ? `/trips/${tripId}/${tab.href}` : `/trips/${tripId}`
  }

  function prefetchTab(tab: (typeof TABS)[number]) {
    if (!tripId) return

    if (tab.key === "overview") {
      void queryClient.prefetchQuery({
        queryKey: tripOverviewKey(tripId),
        queryFn: () => tripOverviewApi.get(tripId),
        staleTime: 5 * 60 * 1000,
      })
      return
    }

    void queryClient.prefetchQuery({
      queryKey: ["trips", "detail", tripId],
      queryFn: () => tripApi.get(tripId),
    })

    if (tab.key === "transport") {
      void queryClient.prefetchQuery({
        queryKey: ["transportations", "list", tripId],
        queryFn: () => transportationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
      return
    }

    if (tab.key === "stay") {
      void queryClient.prefetchQuery({
        queryKey: ["accommodations", "list", tripId],
        queryFn: () => accommodationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
      return
    }

    if (tab.key === "budget") {
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
    <nav
      className="sticky z-30 top-0 mt-3 md:mt-4 md:top-[calc(3.5rem+1px)] w-full"
      aria-label="Trip sections"
    >
      <div
        className="no-scrollbar flex items-center justify-between gap-1 overflow-x-auto px-margin-mobile md:px-margin-desktop py-1 w-full max-w-max-width mx-auto border-b border-border/30 bg-background/90 backdrop-blur-xl md:justify-center"
        role="tablist"
      >
        {TABS.map((tab) => {
          const href = tabHref(tab)
          const isActive = tab.href === ""
            ? pathname === `/trips/${tripId}`
            : pathname.startsWith(`/trips/${tripId}/${tab.href}`)

          return (
            <Link
              key={tab.href}
              href={href}
              prefetch={false}
              onMouseEnter={() => prefetchTab(tab)}
              onFocus={() => prefetchTab(tab)}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "relative flex min-w-0 flex-1 snap-start flex-col items-center justify-center gap-1 rounded-full px-1 pt-2 pb-3 text-sm font-medium transition-all duration-200",
                "md:flex-none md:flex-row md:gap-1.5 md:px-4 md:py-2.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <tab.icon
                className={cn(
                  "h-5 w-5 md:h-4 md:w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="max-w-full truncate text-[10px] font-medium leading-none md:text-sm">
                {tab.label}
              </span>
              {/* Iter 52 — fixed-width active indicator (same width on every tab) */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-1 mx-auto h-[3px] w-6 rounded-full bg-primary transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
