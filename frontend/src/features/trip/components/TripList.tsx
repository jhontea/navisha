"use client"

import { useEffect, useRef, useState } from "react"
import { useUpcomingTrips } from "../hooks/useTrips"
import { TripCard } from "./TripCard"
import { OnboardingCard } from "./OnboardingCard"
import { useAuth } from "@/features/auth/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"
import type { Trip } from "../types"

// W-HOME-01 — how far each arrow click scrolls the carousel (px).
// Tuned to roughly one card width so navigation feels natural.
const SCROLL_STEP = 320

function NoUpcomingTrips() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-base font-semibold text-foreground">No upcoming trips</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your past trips are still in your trip list.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/trips/new"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Plan a trip
        </Link>
        <Link
          href="/trips"
          className="inline-flex h-11 items-center rounded-lg border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          View all trips
        </Link>
      </div>
    </div>
  )
}

export function TripList({
  enabled = true,
  loading = false,
  fallbackData,
  hasAnyTrips = false,
}: {
  enabled?: boolean
  loading?: boolean
  fallbackData?: { items: Trip[] }
  /** Whether the user owns any trip at all (past ones included). */
  hasAnyTrips?: boolean
}) {
  const { data, isLoading, isError, error: _error } = useUpcomingTrips(6, enabled)
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0]

  // W-HOME-01 — carousel scroll state
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    // Re-check on resize (breakpoint changes alter card width)
    window.addEventListener("resize", updateScrollState)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [data])

  function scrollByCards(direction: "left" | "right") {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    })
  }

  if (isLoading || loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="glass" className="h-56 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load trips. Please try again.
      </p>
    )
  }

  const trips = data?.items ?? fallbackData?.items ?? []

  if (trips.length === 0) {
    // Onboarding is for users with no trips at all. Someone whose trips are
    // all in the past just has nothing upcoming.
    return hasAnyTrips ? <NoUpcomingTrips /> : <OnboardingCard userName={firstName} />
  }

  return (
    <div className="relative">
      {/* W-HOME-01 — nav arrows (desktop). Hidden when no room to scroll. */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByCards("left")}
          aria-label="Scroll trips left"
          className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/90 p-2 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-background hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByCards("right")}
          aria-label="Scroll trips right"
          className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/90 p-2 text-foreground shadow-md backdrop-blur-md transition-all hover:bg-background hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* W-HOME-01 — horizontal carousel with scroll-snap.
          Cards keep a fixed width so they scroll cleanly; snap ensures they "click" into place. */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
        role="list"
      >
        {trips.map((t) => (
          <div
            key={t.id}
            role="listitem"
            className="snap-start shrink-0 w-[280px] sm:w-[320px]"
          >
            <TripCard trip={t} />
          </div>
        ))}
      </div>
    </div>
  )
}
