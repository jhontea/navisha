import Link from "next/link"
import { memo } from "react"
import { MapPin } from "lucide-react"

import { StatusChip } from "@/components/StatusChip"
import { cn } from "@/lib/utils"
import { formatTripRange, tripTimingLabel } from "../lib/home"
import { getTripDateMetrics } from "../lib/status"
import { resolveTripCover, tripCoverSrcSet } from "../lib/cover"
import { CoverDestination } from "./CoverDestination"
import type { Trip } from "../types"

/** Trip cover illustration, or the dusk-navy fallback when there is none (DESIGN.md §7). */
export function TripCover({
  trip,
  sizes,
  className,
  priority = false,
}: {
  trip: Trip
  sizes: string
  className?: string
  priority?: boolean
}) {
  const src = resolveTripCover(trip.cover_image_url, trip.description, 768)
  const srcSet = tripCoverSrcSet(trip.cover_image_url, trip.description, [480, 640, 768, 960])

  return (
    <div className={cn("bg-cover-fallback relative overflow-hidden", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <CoverDestination destination={trip.description} className="inset-0 m-auto h-fit justify-center px-4 text-base" />
      )}
    </div>
  )
}

/** One trip in the Trips grid: cover, title, destination, one meta line. */
export const TripCard = memo(function TripCard({ trip }: { trip: Trip }) {
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const timing = tripTimingLabel(metrics)

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex flex-col rounded-2xl border bg-card p-1.5 shadow-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-overlay focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0"
    >
      <TripCover
        trip={trip}
        sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 480px"
        className="aspect-video w-full rounded-xl [&_img]:object-[75%_50%]"
      />
      <div className="flex flex-1 flex-col gap-1 px-2.5 pb-2 pt-3">
        <h3 className="line-clamp-2 font-display text-lg font-extrabold leading-snug text-foreground">{trip.title}</h3>
        {trip.description && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{trip.description}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground tabular-nums">
          <StatusChip tone={metrics.status === "past" ? "neutral" : metrics.status === "active" ? "success" : "info"}>{timing}</StatusChip>
          <span>
            {formatTripRange(trip.start_date, trip.end_date)} · {trip.base_currency}
          </span>
        </div>
      </div>
    </Link>
  )
})
