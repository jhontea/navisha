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
      <div className="flex h-40 flex-col justify-between rounded-2xl bg-primary/10 p-6">
        <MaterialIcon name="flight_takeoff" size={32} className="text-primary" />
        <div>
          <p className="text-headline-md font-headline-md text-on-primary-fixed">
            {completed}
          </p>
          <p className="text-label-md font-label-md text-on-primary-fixed-variant">
            Trips Completed
          </p>
        </div>
      </div>

      {/* Currencies Used */}
      <div className="flex h-40 flex-col justify-between rounded-2xl bg-stay-purple/30 p-6">
        <MaterialIcon name="public" size={32} className="text-on-secondary-fixed" />
        <div>
          <p className="text-headline-md font-headline-md text-on-secondary-fixed">
            {currencies}
          </p>
          <p className="text-label-md font-label-md text-on-secondary-fixed-variant">
            Currencies Used
          </p>
        </div>
      </div>

      {/* Traveler Level — full width on tablet, 1-col on desktop */}
      <div className="col-span-1 flex h-40 items-center gap-6 rounded-2xl bg-surface-container p-6 sm:col-span-2 lg:col-span-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-headline-sm font-headline-sm text-on-surface mb-1">
            Traveler Level: {level}
          </p>
          <p className="line-clamp-2 text-body-sm font-body-sm text-on-surface-variant">
            {upcoming > 0 ? `${upcoming} upcoming · ` : ""}
            {nextLevel
              ? `${milesToNext} miles until ${nextLevel.name} status`
              : "Max level reached"}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
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
