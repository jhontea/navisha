"use client"

import { useAuth } from "@/features/auth/hooks"
import { TripList } from "@/features/trip/components/TripList"
import { StatsSection } from "@/features/trip/components/StatsSection"
import { Sparkles, Compass, ArrowLeftRight, ChevronRight } from "lucide-react"
import Link from "next/link"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/**
 * Dashboard page.
 * Iter 29 — greeting: emoji based on time of day
 * Iter 30 — quick actions: better layout, tighter spacing on mobile
 * Iter 31 — section labels: larger, bolder
 * Iter 32 — floating FAB on mobile: create new trip shortcut
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "traveler"

  const hour = new Date().getHours()
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "👋" : "🌙"

  return (
    <div className="relative mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-6 pb-28 md:pb-16 animate-fade-in">

      {/* ── Greeting Header ── */}
      <header className="mb-8">
        <p className="text-sm text-muted-foreground tracking-wide">
          {getGreeting()}, <span className="font-semibold text-foreground">{firstName}</span> {greetingEmoji}
        </p>
        <h1 className="text-2xl font-bold tracking-tight font-heading md:text-3xl">
          <span className="text-gradient-sunset">
          Your Adventures
          </span>
        </h1>
      </header>

      {/* ── Upcoming Trips (PRIMARY focus) ── */}
      {/* Repositioned to top: trips are why users return. Label fixed (was "Recent"
          but hook fetches upcoming). Subtitle directs attention. */}
      <section className="mb-10" aria-labelledby="trips-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="trips-heading" className="text-lg font-bold font-heading text-foreground">
              Upcoming Trips
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Pick up where you left off</p>
          </div>
          <Link
            href="/trips"
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1 py-0.5"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <TripList />
      </section>

      {/* ── Quick Actions (SECONDARY) ── */}
      <section className="mb-10" aria-labelledby="actions-heading">
        <h2
          id="actions-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Quick Actions
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Link
            href="/trips/generate"
            className="group glass flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 hover:shadow-chromatic hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-[hsl(250,70%,55%)] to-[hsl(200,90%,60%)] text-white shadow-sm shadow-primary/20" aria-hidden="true">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm">Generate with AI</p>
              <p className="text-xs text-muted-foreground truncate">Describe your dream trip</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <Link
            href="/trips/new"
            className="group glass flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 hover:shadow-chromatic hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(185,80%,40%)] to-[hsl(200,80%,50%)] text-white shadow-sm shadow-[hsl(185,80%,40%)]/20" aria-hidden="true">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm">Plan Manually</p>
              <p className="text-xs text-muted-foreground truncate">Build step by step</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <Link
            href="/currency"
            className="group glass flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 hover:shadow-chromatic hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-chromatic-mint to-chromatic-ocean text-white shadow-sm shadow-chromatic-mint/20" aria-hidden="true">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm">Currency</p>
              <p className="text-xs text-muted-foreground truncate">Convert instantly</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── Travel Stats (TERTIARY — gamification, moved to bottom) ── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Travel Stats
        </h2>
        <StatsSection />
      </section>

    </div>
  )
}
