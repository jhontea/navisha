import Link from "next/link"
import { memo } from "react"
import { formatDate } from "@/lib/utils"
import {
  STATUS_LABEL,
  tripStatus,
  type TripStatus,
} from "../lib/status"
import { MaterialIcon } from "@/components/MaterialIcon"
import type { Trip } from "../types"

const STATUS_STYLE: Record<TripStatus, { chip: string; dot: string }> = {
  upcoming: { chip: "bg-chromatic-sunset/15 text-chromatic-sunset border-chromatic-sunset/30", dot: "bg-chromatic-sunset" },
  active: { chip: "bg-chromatic-ocean/15 text-chromatic-ocean border-chromatic-ocean/30", dot: "bg-chromatic-ocean" },
  past: { chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

/** Full-bleed trip card — glass overlay, chromatic status, day progress. */
export const TripCard = memo(function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.start_date, trip.end_date)
  const hasCover = Boolean(trip.cover_image_url)
  const style = STATUS_STYLE[status]

  return (
    <Link
      href={`/trips/${trip.id}/overview`}
      className="group relative block overflow-hidden rounded-2xl glass transition-all duration-300 hover:bg-white/25 hover:shadow-chromatic active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chromatic-sunset focus-visible:ring-offset-2 before:absolute before:inset-0 before:z-20 before:rounded-2xl before:bg-gradient-to-r before:from-white/0 before:via-white/15 before:to-white/0 before:translate-x-[-200%] before:transition-transform before:duration-700 hover:before:translate-x-[200%] before:pointer-events-none"
    >
      {/* Cover image area */}
      <div className="relative h-56 w-full overflow-hidden sm:h-64">
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trip.cover_image_url}
              alt={trip.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Glass gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="trip-cover-gradient h-full w-full" />
        )}

        {/* Status chip — glass pill, top-right */}
        <div className={`absolute right-3 top-3 z-10 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md ${style.chip}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Title + destination overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          {trip.description && (
            <div className="mb-1 flex items-center gap-1 text-xs text-white/80">
              <MaterialIcon name="location_on" size={14} />
              <span className="line-clamp-1">{trip.description}</span>
            </div>
          )}
          <h3 className="text-lg font-bold leading-tight font-heading">{trip.title}</h3>
        </div>
      </div>

      {/* Date + currency bar */}
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MaterialIcon name="calendar_today" size={16} />
          <span className="tabular-nums">
            {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
          </span>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          {trip.base_currency}
        </span>
      </div>
    </Link>
  )
});
