"use client"

import { useEffect, useRef } from "react"
import { Plane, CalendarCheck, Globe, Award, Trophy, Gem, Medal } from "lucide-react"
import { useTrips } from "../hooks/useTrips"
import { tripStatus } from "../lib/status"
import type { Trip } from "../types"

/** Animated number counter that counts up on mount.
 *  Uses requestAnimationFrame (aligned to display refresh) instead of
 *  setInterval — smoother animation and lower CPU overhead, especially
 *  when multiple counters mount together on the dashboard. */
function AnimatedCount({ to, duration = 800 }: { to: number; duration?: number }) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    if (to === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = String(to)
      return
    }

    let startedAt: number | null = null

    const step = (now: number) => {
      if (startedAt === null) startedAt = now
      const elapsed = now - startedAt
      const progress = Math.min(elapsed / duration, 1)
      element.textContent = String(Math.floor(progress * to))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        element.textContent = String(to)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [to, duration])

  return <span ref={elementRef} className="tabular-nums">0</span>
}

export function StatsSection({
  enabled = true,
  fallbackTrips = [],
}: {
  enabled?: boolean
  fallbackTrips?: Trip[]
}) {
  const { data } = useTrips(enabled)
  const trips = data?.pages.flatMap((p) => p.items) ?? fallbackTrips

  const completed = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "past",
  ).length
  const upcoming = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "upcoming",
  ).length
  const currencies = new Set(trips.map((t) => t.base_currency)).size

  // Loyalty math: each completed trip = 100 miles
  const totalMiles = completed * 100
  const levelThresholds = [
    { name: "Bronze", min: 0 },
    { name: "Silver", min: 300 },
    { name: "Gold",   min: 600 },
    { name: "Platinum", min: 1000 },
  ]
  const currentLevel = [...levelThresholds].reverse().find((l) => totalMiles >= l.min) ?? levelThresholds[0]
  const nextLevel = levelThresholds.find((l) => l.min > totalMiles)
  const milesToNext = nextLevel ? nextLevel.min - totalMiles : 0
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((totalMiles - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100
  const level = currentLevel.name

  const LevelIcon = level === "Platinum"
    ? Gem
    : level === "Gold"
    ? Trophy
    : level === "Silver"
    ? Award
    : Medal

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Trips Completed */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 cursor-default">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-sunset/15">
          <Plane className="h-5 w-5 text-chromatic-sunset" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground font-heading leading-none">
            <AnimatedCount to={completed} />
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1">Trips Completed</p>
        </div>
      </div>

      {/* Upcoming */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 cursor-default">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground font-heading leading-none">
            <AnimatedCount to={upcoming} />
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1">Upcoming Trips</p>
        </div>
      </div>

      {/* Currencies Used */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 cursor-default">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-ocean/15">
          <Globe className="h-5 w-5 text-chromatic-ocean" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground font-heading leading-none">
            <AnimatedCount to={currencies} />
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1">Currencies Used</p>
        </div>
      </div>

      {/* Traveler Level */}
      <div className="col-span-2 lg:col-span-1 glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 cursor-default">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-aurora/15">
            <LevelIcon className="h-5 w-5 text-chromatic-aurora" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-chromatic-aurora bg-chromatic-aurora/10 px-2 py-0.5 rounded-full">
            {level}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground leading-snug">Traveler Level</p>
            {nextLevel && (
              <span className="text-[10px] font-bold tabular-nums text-chromatic-aurora">
                {progressPct}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nextLevel ? `${milesToNext} mi to ${nextLevel.name}` : "Max level!"}
          </p>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chromatic-aurora via-chromatic-sunset to-chromatic-ocean bg-[length:200%_200%] animate-gradient-shift transition-all duration-1000 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
