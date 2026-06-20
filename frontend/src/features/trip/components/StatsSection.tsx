"use client"

import { Award, Globe, PlaneTakeoff } from "lucide-react"
import { useTrips } from "../hooks/useTrips"
import { tripStatus } from "../lib/status"

// Derived counts from already-fetched trips. No new endpoint required.
export function StatsSection() {
  const { data } = useTrips()
  const trips = data?.pages.flatMap((p) => p.items) ?? []

  const completed = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "past",
  ).length
  const upcoming = trips.filter(
    (t) => tripStatus(t.start_date, t.end_date) === "upcoming",
  ).length
  // Use distinct base currencies as a stand-in for "countries visited" until
  // we have proper country metadata on the trip.
  const currencies = new Set(trips.map((t) => t.base_currency)).size

  // Hardcoded gold-level mock — real loyalty math TBD.
  const milesToNext = 250
  const progressPct = 75

  return (
    <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="flex h-40 flex-col justify-between rounded-2xl bg-primary/10 p-6 md:col-span-1">
        <PlaneTakeoff className="h-8 w-8 text-primary" />
        <div>
          <p className="font-heading text-headline-md text-foreground">
            {completed}
          </p>
          <p className="text-label-md text-muted-foreground">
            Trips completed
          </p>
        </div>
      </div>

      <div className="flex h-40 flex-col justify-between rounded-2xl bg-purple-100 p-6 dark:bg-purple-500/15 md:col-span-1">
        <Globe className="h-8 w-8 text-purple-700 dark:text-purple-300" />
        <div>
          <p className="font-heading text-headline-md text-foreground">
            {currencies}
          </p>
          <p className="text-label-md text-muted-foreground">
            Currencies tracked
          </p>
        </div>
      </div>

      <div className="flex h-40 items-center gap-6 rounded-2xl bg-muted/60 p-6 md:col-span-2">
        <div className="flex-1">
          <p className="mb-1 font-heading text-headline-sm">
            Traveler level: {completed > 5 ? "Gold" : "Silver"}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {upcoming} upcoming · {milesToNext} miles until next status
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="hidden h-20 w-20 items-center justify-center rounded-full bg-primary/5 sm:flex">
          <Award className="h-10 w-10 text-primary" />
        </div>
      </div>
    </section>
  )
}
