"use client"

import { useEffect, useRef, useState } from "react"
import { Plane, CalendarCheck, Globe, Award, Trophy, Gem, Medal } from "lucide-react"
import { useTrips } from "../hooks/useTrips"
import { tripStatus } from "../lib/status"

/** Animated number counter that counts up on mount */
function AnimatedCount({ to, duration = 800 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (to === 0) { setCount(0); return }
    const steps = 20
    const increment = to / steps
    let current = 0
    ref.current = setInterval(() => {
      current += increment
      if (current >= to) {
        setCount(to)
        if (ref.current) clearInterval(ref.current)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [to, duration])

  return <span className="tabular-nums">{count}</span>
}

export function StatsSection() {
  const { data } = useTrips()
  const trips = data?.pages.flatMap((p) => p.items) ?? []

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
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic transition-all duration-300">
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
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic transition-all duration-300">
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
      <div className="glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic transition-all duration-300">
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
      <div className="col-span-2 lg:col-span-1 glass flex flex-col gap-3 rounded-2xl p-5 hover:bg-white/20 hover:shadow-chromatic transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-aurora/15">
            <LevelIcon className="h-5 w-5 text-chromatic-aurora" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-chromatic-aurora bg-chromatic-aurora/10 px-2 py-0.5 rounded-full">
            {level}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">Traveler Level</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nextLevel ? `${milesToNext} mi to ${nextLevel.name}` : "Max level!"}
          </p>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chromatic-aurora via-chromatic-sunset to-chromatic-ocean bg-[length:200%_200%] animate-gradient-shift transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
