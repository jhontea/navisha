import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { formatTripRange, tripTimingLabel } from "../lib/home"
import { getTripDateMetrics } from "../lib/status"
import type { Trip } from "../types"
import { TripCover } from "./TripCard"

/** The trip in progress, or the next one: shown above the Trips list. */
export function NextUpCard({ trip }: { trip: Trip }) {
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const active = metrics.status === "active"

  return (
    <section
      aria-labelledby="next-up-heading"
      className="overflow-hidden rounded-xl border bg-card md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <TripCover
        trip={trip}
        priority
        sizes="(max-width: 767px) calc(100vw - 2rem), 460px"
        className="aspect-[16/9] w-full md:aspect-auto md:h-full md:min-h-52"
      />
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="text-sm font-medium text-primary">{active ? "Happening now" : "Next up"}</p>
          <h2 id="next-up-heading" className="mt-0.5 text-xl font-semibold leading-snug text-foreground">
            {trip.title}
          </h2>
          {trip.description && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{trip.description}</span>
            </p>
          )}
        </div>

        <p className="text-sm text-foreground tabular-nums">
          <span className="font-semibold">{tripTimingLabel(metrics)}</span>
          <span className="text-muted-foreground"> · {formatTripRange(trip.start_date, trip.end_date)}</span>
        </p>

        {active && (
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Trip progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={metrics.percent}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${metrics.percent}%` }} />
          </div>
        )}

        <Link
          href={`/trips/${trip.id}`}
          className={buttonVariants({ className: "mt-auto self-start" })}
        >
          {active ? "Open today's plan" : "Open trip"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
