"use client"

import { CalendarCheck, CalendarDays, Coins, Plane, type LucideIcon } from "lucide-react"

import { useTrips } from "../hooks/useTrips"
import { groupTrips, tripStats } from "../lib/home"

/** Travel stats on the Profile page, from the user's real trips only. */
export function StatsSection() {
  const { data, isLoading } = useTrips()
  const trips = data?.pages.flatMap((p) => p.items) ?? []
  const { upcoming, past } = groupTrips(trips)
  const { days, currencies } = tripStats(trips)

  const tiles: { label: string; value: number; Icon: LucideIcon }[] = [
    { label: past.length === 1 ? "Trip completed" : "Trips completed", value: past.length, Icon: Plane },
    { label: upcoming.length === 1 ? "Upcoming trip" : "Upcoming trips", value: upcoming.length, Icon: CalendarCheck },
    { label: "Days planned", value: days, Icon: CalendarDays },
    { label: currencies === 1 ? "Currency used" : "Currencies used", value: currencies, Icon: Coins },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isLoading}>
      {tiles.map(({ label, value, Icon }) => (
        <div key={label} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none text-foreground tabular-nums">
              {isLoading ? "—" : value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
