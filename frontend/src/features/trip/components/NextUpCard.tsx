import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { formatTripRange, tripTimingLabel } from "../lib/home"
import { getTripDateMetrics } from "../lib/status"
import { splitTripTitle } from "../lib/title"
import type { Trip } from "../types"
import { TripCover } from "./TripCard"

/**
 * The trip in progress, or the next one, as a big cover card above the Trips
 * list (docs/DESIGN.md §5 NextTripCard). Title sits on the dark left side of
 * the cover illustration.
 */
export function NextUpCard({ trip }: { trip: Trip }) {
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const active = metrics.status === "active"
  const nights = Math.max(0, metrics.totalDays - 1)
  const { main, rest } = splitTripTitle(trip.title)

  return (
    <section aria-labelledby="next-up-heading" className="relative overflow-hidden rounded-3xl shadow-card">
      <TripCover
        trip={trip}
        priority
        sizes="(min-width: 1920px) 1920px, 100vw"
        className="absolute inset-0 h-full w-full [&_img]:object-[75%_50%]"
      />
      <div className="absolute inset-0 bg-linear-to-r from-black/50 via-black/15 to-transparent" aria-hidden="true" />

      <div className="relative flex min-h-72 flex-col items-start gap-3 p-5 text-on-cover sm:p-7 md:min-h-80 md:max-w-[65%] md:p-8">
        <span className="rounded-full bg-cover-button/90 px-3 py-1 text-xs font-extrabold text-cover-button-foreground">
          {active ? "Happening now" : "Next up"} · {tripTimingLabel(metrics)}
        </span>

        <div className="mt-auto">
          <h2 id="next-up-heading" className="font-display text-3xl font-extrabold leading-tight text-balance md:text-4xl">
            {main}
            {rest && <span className="opacity-70"> {rest}</span>}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-on-cover/85 tabular-nums">
            <span>
              {formatTripRange(trip.start_date, trip.end_date)} · {nights} {nights === 1 ? "night" : "nights"}
            </span>
            {trip.description && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{trip.description}</span>
              </span>
            )}
          </p>
        </div>

        {active && (
          <div
            className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-on-cover/25"
            role="progressbar"
            aria-label="Trip progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={metrics.percent}
          >
            <div className="h-full rounded-full bg-on-cover" style={{ width: `${metrics.percent}%` }} />
          </div>
        )}

        <Link href={`/trips/${trip.id}`} className={buttonVariants({ variant: "cover", className: "px-5" })}>
          {active ? "Open today's plan" : "Open trip"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
