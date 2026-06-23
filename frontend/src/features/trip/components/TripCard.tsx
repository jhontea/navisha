import Link from "next/link"
import { cn, formatDate } from "@/lib/utils"
import {
  STATUS_LABEL,
  tripStatus,
  type TripStatus,
} from "../lib/status"
import type { Trip } from "../types"

function MaterialIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

// Badge background + text per status — matches template style
const STATUS_BADGE: Record<TripStatus, { bg: string; text: string }> = {
  upcoming: { bg: 'rgba(255,255,255,0.9)', text: '#0058bc' },
  active: { bg: 'rgba(255,255,255,0.9)', text: '#059669' },
  past: { bg: 'rgba(255,255,255,0.9)', text: '#717786' },
}

export function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.start_date, trip.end_date)
  const hasCover = Boolean(trip.cover_image_url)
  return (
    <Link
      href={`/trips/${trip.id}/overview`}
      className={cn(

        "group block overflow-hidden rounded-xl border border-[#F1F5F9] bg-surface-container-lowest",
        "trip-card-shadow trip-card-hover transition-all duration-300 cursor-pointer",
      )}
    >
      {/* Cover image / gradient placeholder */}
      <div className="relative h-48 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            borderRadius: 9999,
            backgroundColor: 'rgba(249,249,255,0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '16px',
            letterSpacing: '0.02em',
            color: STATUS_BADGE[status].text,
          }}
        >
          {STATUS_LABEL[status]}
        </div>
        <div
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          style={{
            ...(hasCover
              ? {
                  backgroundImage: `url('${trip.cover_image_url}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  backgroundColor: '#d8e2ff',
                }),
          }}
        />
      </div>

      {/* Card body */}
      <div className="p-6">
        {/* Destination / description */}
        {trip.description && (
          <div className="flex items-center gap-2 text-primary font-label-sm text-label-sm mb-2">
            <MaterialIcon name="location_on" size={16} />
            <span className="line-clamp-1">{trip.description}</span>
          </div>
        )}

        <h3 className="text-headline-sm font-headline-sm text-on-surface mb-2">
          {trip.title}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <MaterialIcon name="calendar_today" size={18} />
            {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
          </div>

          {/* Currency badge */}
          <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
            {trip.base_currency}
          </span>
        </div>
      </div>
    </Link>
  )
}
