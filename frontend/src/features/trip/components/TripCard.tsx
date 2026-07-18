import Link from "next/link"
import { memo } from "react"
import { formatDate } from "@/lib/utils"
import { Calendar, MapPin, ChevronRight, Clock } from "lucide-react"
import {
  STATUS_LABEL,
  tripStatus,
  type TripStatus,
} from "../lib/status"
import type { Trip } from "../types"
import { canRenderTripCover } from "../lib/cover"

const STATUS_STYLE: Record<TripStatus, { chip: string; dot: string }> = {
  upcoming: { chip: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  active:   { chip: "bg-chromatic-ocean/15 text-chromatic-ocean border-chromatic-ocean/30", dot: "bg-chromatic-ocean animate-pulse" },
  past:     { chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

/**
 * Trip card — cover image at top, title/meta in clean content area below.
 * Iter 33 — cover: taller on md+ screens for better visual weight
 * Iter 34 — active trip: progress bar shows gradient, day badge more legible
 * Iter 35 — description fallback: show "Tap to view" when no description
 * Iter 36 — currency badge: pill with bg-primary/8 → primary/10 (higher contrast)
 * Iter 37 — total days shown always, not just when active
 */
export const TripCard = memo(function TripCard({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.start_date, trip.end_date)
  const hasCover = canRenderTripCover(trip.cover_image_url)
  const style = STATUS_STYLE[status]

  const today = new Date()
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
  const daysPassed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000))
  const progressPct = status === "active"
    ? Math.min(100, Math.round((daysPassed / totalDays) * 100))
    : 0
  const currentDay = Math.min(daysPassed + 1, totalDays)

  // Iter 37 — days-until / days-total label
  const daysUntilStart = Math.ceil((start.getTime() - today.getTime()) / 86400000)
  const daysMeta =
    status === "upcoming"
      ? daysUntilStart > 0
        ? `${daysUntilStart}d away`
        : "Starting soon"
      : status === "past"
      ? `${totalDays} day${totalDays !== 1 ? "s" : ""}`
      : null

  return (
    <Link
      href={`/trips/${trip.id}/overview`}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass transition-all duration-300 hover:bg-white/25 hover:shadow-chromatic hover:-translate-y-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View trip: ${trip.title}`}
    >
      {/* ── Cover image — Iter 33: taller on md ── */}
      <div className="relative h-40 md:h-44 w-full shrink-0 overflow-hidden">
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trip.cover_image_url}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </>
        ) : (
          <div className="trip-cover-gradient h-full w-full" />
        )}

        {/* Status chip — top-right */}
        <div
          className={`absolute right-3 top-3 z-10 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${style.chip}`}
          role="status"
          aria-label={`Trip status: ${STATUS_LABEL[status]}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Iter 34 — Active: Day badge top-left with better contrast */}
        {status === "active" && (
          <div className="absolute left-3 top-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm tabular-nums">
            Day {currentDay} of {totalDays}
          </div>
        )}

        {/* Iter 37 — upcoming: days away badge */}
        {status === "upcoming" && daysMeta && (
          <div className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {daysMeta}
          </div>
        )}
      </div>

      {/* ── Active progress bar — Iter 34: gradient ── */}
      {status === "active" && (
        <div
          className="h-1 w-full bg-muted overflow-hidden shrink-0"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Trip progress: ${progressPct}%`}
        >
          <div
            className="h-full bg-gradient-to-r from-[hsl(185,80%,40%)] to-primary transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        {/* Title */}
        <h3 className="text-base font-bold leading-snug font-heading text-foreground line-clamp-2">
          {trip.title}
        </h3>

        {/* Iter 35 — description or fallback */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-primary/60" aria-hidden="true" />
          <span className="line-clamp-1">
            {trip.description ?? "Tap to view details"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1 border-t border-border/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              <time className="tabular-nums text-[11px]">
                {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
              </time>
            </div>
            {/* Iter 37 — always show total days */}
            <div className="flex items-center gap-1 text-muted-foreground/70">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="text-[11px]">{totalDays}d</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Iter 36 — currency pill: higher contrast */}
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {trip.base_currency}
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </Link>
  )
})
