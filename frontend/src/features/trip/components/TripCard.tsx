import Link from "next/link"
import { memo, useLayoutEffect, useRef, ViewTransition } from "react"
import { Compass, MapPin } from "lucide-react"

import { StatusChip } from "@/components/StatusChip"
import { cn } from "@/lib/utils"
import { formatTripRange, tripTimingLabel } from "../lib/home"
import { getTripDateMetrics } from "../lib/status"
import { preloadHeroCover, resolveTripCover, TRIP_COVER_SHARE, tripCoverSrcSet } from "../lib/cover"
import type { Trip } from "../types"

/** Trip cover illustration, or the dusk-navy fallback when there is none (DESIGN.md §7). */
export function TripCover({
  trip,
  sizes,
  className,
  priority = false,
  muted = false,
}: {
  trip: Trip
  sizes: string
  className?: string
  priority?: boolean
  /** Past trips: a softer, partly grey cover so upcoming trips stand out. */
  muted?: boolean
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
          width={1904}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn("h-full w-full object-cover", muted && "grayscale-[60%]")}
        />
      ) : (
        // The destination is already named next to every cover, so the fallback stays decorative.
        <Compass className="absolute inset-0 m-auto h-14 w-14 text-on-cover/20" strokeWidth={1.5} aria-hidden="true" />
      )}
    </div>
  )
}

/**
 * Props for a link that opens a trip with the cover morph. Scrolling to the top happens in the
 * commit that leaves: Next.js keeps the scroll when the new content is in view, which would
 * park the hero above the viewport.
 */
export function useOpenTripLink(trip: Trip) {
  const leaving = useRef(false)
  useLayoutEffect(
    () => () => {
      if (leaving.current) window.scrollTo({ top: 0, behavior: "instant" })
    },
    [],
  )
  return {
    transitionTypes: ["trip-open"],
    onPointerDown: () => preloadHeroCover(trip.cover_image_url, trip.description),
    // Next calls this only for a real navigation, not a Ctrl/Meta/Shift-click.
    onNavigate: () => {
      leaving.current = true
    },
  }
}

/** One trip in the Trips grid: cover, title, destination, one meta line. */
export const TripCard = memo(function TripCard({ trip }: { trip: Trip }) {
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const timing = tripTimingLabel(metrics)
  const openLink = useOpenTripLink(trip)

  return (
    <Link
      href={`/trips/${trip.id}`}
      {...openLink}
      className="group flex flex-col rounded-2xl border bg-card p-1.5 shadow-card transition-[translate,scale,box-shadow] duration-150 ease-out hover:-translate-y-0.5 motion-safe:active:scale-[.96] hover:shadow-overlay focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0"
    >
      <ViewTransition name={`trip-cover-${trip.id}`} share={TRIP_COVER_SHARE} default="none">
        <TripCover
          trip={trip}
          muted={metrics.status === "past"}
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 480px"
          className="aspect-video w-full rounded-xl [&_img]:object-[75%_50%]"
        />
      </ViewTransition>
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
