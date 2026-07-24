"use client"

import { useState, useMemo } from "react"
import { BackLink } from "@/components/BackLink"
import { EmptyState } from "@/components/EmptyState"
import { TripCard } from "@/features/trip/components/TripCard"
import { TripCTAs } from "@/features/trip/components/TripCTAs"
import { useTrips } from "@/features/trip/hooks/useTrips"
import { tripStatus } from "@/features/trip/lib/status"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ChevronDown, Loader2, Map, ArrowDownUp } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { EmptyTripsIllustration } from "@/components/illustrations/EmptyStateIllustrations"

type FilterTab = "all" | "active" | "upcoming" | "past"

type SortMode = "recent" | "oldest" | "trip-date" | "title"

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "active",   label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past",     label: "Past" },
]

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "recent",    label: "Recently added" },
  { id: "oldest",    label: "Oldest first" },
  { id: "trip-date", label: "Trip date" },
  { id: "title",     label: "Title (A–Z)" },
]

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [sortMode, setSortMode] = useState<SortMode>("recent")

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrips()

  const allTrips = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  )

  // Client-side filter by status
  const filtered = useMemo(() => {
    if (activeTab === "all") return allTrips
    return allTrips.filter((t) => tripStatus(t.start_date, t.end_date) === activeTab)
  }, [allTrips, activeTab])

  // Client-side sort by selected mode
  const trips = useMemo(() => {
    const arr = [...filtered]
    switch (sortMode) {
      case "oldest":
        return arr.sort((a, b) => a.created_at.localeCompare(b.created_at))
      case "trip-date":
        return arr.sort((a, b) => a.start_date.localeCompare(b.start_date))
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title))
      case "recent":
      default:
        return arr.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
  }, [filtered, sortMode])

  // Count per tab
  const counts = useMemo(() => ({
    all:      allTrips.length,
    active:   allTrips.filter((t) => tripStatus(t.start_date, t.end_date) === "active").length,
    upcoming: allTrips.filter((t) => tripStatus(t.start_date, t.end_date) === "upcoming").length,
    past:     allTrips.filter((t) => tripStatus(t.start_date, t.end_date) === "past").length,
  }), [allTrips])

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-6 pb-28 animate-fade-in">
      {/* Back to dashboard */}
      <BackLink href="/dashboard" label="Back to Dashboard" />

      {/* ── Header ── */}
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-heading md:text-3xl">
            <span className="text-gradient-sunset">My Trips</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading your trips…"
              : allTrips.length > 0
                ? `${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""} planned`
                : "All your trips in one place"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <TripCTAs />
        </div>
      </header>

      {/* ── Filter tabs + Sort ── */}
      {!isLoading && allTrips.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex items-center gap-1 overflow-x-auto rounded-full border border-border/30 bg-background/90 p-1 backdrop-blur-xl no-scrollbar"
            role="tablist"
            aria-label="Filter trips by status"
          >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                    activeTab === tab.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort trips"
              className="appearance-none rounded-full border border-border/30 bg-background/90 py-2 pl-8 pr-8 text-sm font-medium text-foreground backdrop-blur-xl transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading trips" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="glass" className="h-64 w-full" />
          ))}
        </div>

      ) : isError ? (
        <div className="glass rounded-2xl p-8 text-center" role="alert">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground mb-1">Failed to load trips</p>
          <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
        </div>

      ) : allTrips.length === 0 ? (
        <EmptyState
          size="lg"
          illustration={<EmptyTripsIllustration className="h-40 w-40" />}
          title="No trips yet"
          description="Start planning your first adventure. Create a trip manually or let AI generate one for you."
          action={
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-primary/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Create My First Trip
            </Link>
          }
        />

      ) : trips.length === 0 ? (
        <EmptyState
          size="md"
          icon={Map}
          title={`No ${activeTab} trips`}
          description={
            activeTab === "active"
              ? "You have no trips happening right now."
              : activeTab === "upcoming"
              ? "No upcoming trips planned yet."
              : "No completed trips yet."
          }
        />

      ) : (
        <section aria-label={`${activeTab === "all" ? "All" : TABS.find(t => t.id === activeTab)?.label} trips`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-8 py-3 text-sm font-medium text-foreground hover:bg-white/15 transition-all active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-busy={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading…
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    Load more
                  </>
                )}
              </button>
            </div>
          )}

          {/* End of list */}
          {!hasNextPage && trips.length > 0 && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              {activeTab === "all"
                ? `All ${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""} shown`
                : `${trips.length} ${activeTab} trip${trips.length !== 1 ? "s" : ""} shown`}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
