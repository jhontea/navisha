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

const STATUS_STYLE: Record<TripStatus, string> = {
  upcoming: "text-primary",
  active: "text-emerald-600",
  past: "text-muted-foreground",
}

/** Full-bleed trip card — immersive cover image, mobile-first.
 *  Phase 3B-3: redesigned from dashboard-style bordered card. */
export const TripCard = memo(function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.start_date, trip.end_date)
  const hasCover = Boolean(trip.cover_image_url)

  return (
    <Link
      href={`/trips/${trip.id}/overview`}
      className="group relative block overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Cover image area — full width, taller */}
      <div className="relative h-56 w-full overflow-hidden sm:h-64">
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trip.cover_image_url}
              alt={trip.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay for text readability at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/20" />
        )}

        {/* Status chip — top-right */}
        <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-medium backdrop-blur-sm">
          <span className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</span>
        </div>

        {/* Title + destination — overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          {trip.description && (
            <div className="mb-1 flex items-center gap-1 text-xs text-white/80">
              <MaterialIcon name="location_on" size={14} />
              <span className="line-clamp-1">{trip.description}</span>
            </div>
          )}
          <h3 className="text-lg font-bold leading-tight">{trip.title}</h3>
        </div>
      </div>

      {/* Date + currency info bar */}
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MaterialIcon name="calendar_today" size={16} />
          <span>
            {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
          </span>
        </div>
        <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {trip.base_currency}
        </span>
      </div>
    </Link>
  )
});
