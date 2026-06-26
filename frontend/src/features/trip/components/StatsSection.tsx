"use client"

import { useTrips } from "../hooks/useTrips"
import { tripStatus } from "../lib/status"
import { MaterialIcon } from "@/components/MaterialIcon"

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

  // Real loyalty math: each completed trip = 100 miles
  const totalMiles = completed * 100
  const levelThresholds = [
    { name: "Bronze", min: 0 },
    { name: "Silver", min: 300 },
    { name: "Gold", min: 600 },
    { name: "Platinum", min: 1000 },
  ]
  const currentLevel = [...levelThresholds].reverse().find((l) => totalMiles >= l.min) ?? levelThresholds[0]
  const nextLevel = levelThresholds.find((l) => l.min > totalMiles)
  const milesToNext = nextLevel ? nextLevel.min - totalMiles : 0
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((totalMiles - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100
  const level = currentLevel.name

  return (
    <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Trips Completed */}
      <div className="glass flex h-40 flex-col justify-between rounded-2xl p-6 hover:bg-white/20 hover:animate-glow-pulse transition-all">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-sunset/15">
          <MaterialIcon name="flight_takeoff" size={24} className="text-chromatic-sunset" />
        </div>
        <div>
          <p className="text-headline-md tabular-nums font-heading text-foreground">
            {completed}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            Trips Completed
          </p>
        </div>
      </div>

      {/* Currencies Used */}
      <div className="glass flex h-40 flex-col justify-between rounded-2xl p-6 hover:bg-white/20 transition-all">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-ocean/15">
          <MaterialIcon name="public" size={24} className="text-chromatic-ocean" />
        </div>
        <div>
          <p className="text-headline-md tabular-nums font-heading text-foreground">
            {currencies}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            Currencies Used
          </p>
        </div>
      </div>

      {/* Traveler Level */}
      <div className="glass col-span-1 flex h-40 items-center gap-6 rounded-2xl p-6 sm:col-span-2 lg:col-span-1 hover:bg-white/20 transition-all">
        <div className="min-w-0 flex-1">
          <p className="truncate text-headline-sm font-heading text-foreground mb-1">
            Traveler Level: {level}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {upcoming > 0 ? `${upcoming} upcoming · ` : ""}
            {nextLevel
              ? `${milesToNext} miles until ${nextLevel.name} status`
              : "Max level reached"}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky bg-[length:200%_200%] animate-gradient-shift transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/5">
          <MaterialIcon name="military_tech" size={40} className="text-primary" />
        </div>
      </div>
    </section>
  )
}
