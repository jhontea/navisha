"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Calendar, Map, DollarSign, Bus, Hotel } from "lucide-react"
import { accommodationApi } from "@/features/accommodation/api"
import { expenseApi } from "@/features/expense/api"
import { transportationApi } from "@/features/transportation/api"
import { tripApi } from "@/features/trip/api"

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
 * Iter 90 — swipe left/right navigates to adjacent tab
 */
export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Swipe gesture — track touch on the document so any swipe on the page works
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const activeIndex = TABS.findIndex((tab) =>
    tab.href === ""
      ? pathname === `/trips/${tripId}`
      : pathname.startsWith(`/trips/${tripId}/${tab.href}`)
  )

  // Keep a stable ref to activeIndex so the effect closure doesn't go stale
  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex

  function tabHref(tab: (typeof TABS)[number]) {
    return tab.href ? `/trips/${tripId}/${tab.href}` : `/trips/${tripId}`
  }

  function prefetchTab(tab: (typeof TABS)[number]) {
    if (!tripId) return

    void queryClient.prefetchQuery({
      queryKey: ["trips", "detail", tripId],
      queryFn: () => tripApi.get(tripId),
    })

    if (tab.key === "overview") {
      void queryClient.prefetchQuery({
        queryKey: ["accommodations", "list", tripId],
        queryFn: () => accommodationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
      void queryClient.prefetchQuery({
        queryKey: ["transportations", "list", tripId],
        queryFn: () => transportationApi.list(tripId),
        staleTime: 5 * 60 * 1000,
      })
      void queryClient.prefetchQuery({
        queryKey: ["expenses", "summary", tripId],
        queryFn: () => expenseApi.summary(tripId),
        staleTime: 5 * 60 * 1000,
      })
      return
    }

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

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Iter 91 — skip if touch starts inside a no-swipe zone (e.g. map)
      if ((e.target as Element).closest("[data-no-swipe]")) return
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartX.current === null || touchStartY.current === null) return

      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current

      touchStartX.current = null
      touchStartY.current = null

      // Only fire for clearly horizontal swipes (≥ 50px, x dominates y)
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return

      const idx = activeIndexRef.current
      const nextIndex = dx < 0
        ? Math.max(idx - 1, 0)               // swipe left → previous tab
        : Math.min(idx + 1, TABS.length - 1) // swipe right → next tab

      if (nextIndex !== idx) {
        // Iter 91 — write slide direction for page transition animation
        document.body.dataset.slideDir = dx < 0 ? "left" : "right"
        router.push(tabHref(TABS[nextIndex]))
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend",   onTouchEnd,   { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend",   onTouchEnd)
    }
    // router is stable; tabHref is a pure function of tripId which doesn't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, router])

  return (
    <nav
      className="sticky z-30 top-0 mt-3 md:mt-4 md:top-[calc(3.5rem+1px)] w-full"
      aria-label="Trip sections"
    >
      <div
        className="flex items-center justify-center gap-1 px-4 md:px-8 py-1 w-full max-w-max-width mx-auto border-b border-border/30 bg-background/90 backdrop-blur-xl"
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
              onPointerEnter={() => prefetchTab(tab)}
              onTouchStart={() => prefetchTab(tab)}
              onFocus={() => prefetchTab(tab)}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "relative flex shrink-0 snap-start items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                "rounded-full",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <tab.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
