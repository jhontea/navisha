import Link from "next/link"
import { CalendarDays, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"
import {
  STATUS_LABEL,
  tripStatus,
  type TripStatus,
} from "../lib/status"
import type { Trip } from "../types"

const STATUS_TEXT: Record<TripStatus, string> = {
  upcoming: "text-primary",
  active: "text-emerald-600",
  past: "text-muted-foreground",
}

// Deterministic placeholder image when the trip has no cover_image_url.
// Lorem Picsum returns the same image for the same seed.
function coverUrl(trip: Trip): string {
  if (trip.cover_image_url) return trip.cover_image_url
  const seed = trip.id.replace(/-/g, "").slice(0, 16) || trip.title
  return `https://picsum.photos/seed/${seed}/800/400`
}

export function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.start_date, trip.end_date)
  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "shadow-[0px_12px_24px_rgba(0,0,0,0.03)]",
        "hover:-translate-y-1 hover:shadow-[0px_16px_32px_rgba(0,88,188,0.06)]",
      )}
    >
      <div className="relative h-48 overflow-hidden">
        <span
          className={cn(
            "absolute right-4 top-4 z-10 rounded-full bg-background/90 px-3 py-1 text-label-sm backdrop-blur-md",
            STATUS_TEXT[status],
          )}
        >
          {STATUS_LABEL[status]}
        </span>
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${coverUrl(trip)}')` }}
        />
      </div>

      <div className="p-6">
        {trip.description && (
          <div className="mb-2 inline-flex items-center gap-2 text-label-sm text-primary">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{trip.description}</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-heading text-headline-sm">
            {trip.title}
          </h3>
          <Badge variant="secondary" className="shrink-0">
            {trip.base_currency}
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 text-body-sm text-muted-foreground">
          <CalendarDays className="h-[18px] w-[18px]" />
          {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
        </div>
      </div>
    </Link>
  )
}
