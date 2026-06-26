"use client";

import { memo } from "react";
import { Calendar, Clock, CreditCard, MapPin, Pencil, Trash2 } from "lucide-react";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TripHeroProps {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  baseCurrency?: string;
  coverImageUrl?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  className?: string;
}

/**
 * Visual hero banner for trip detail pages.
 * Iter 41 — min-height increased on mobile for better presence
 * Iter 42 — action buttons: tooltip on hover via title attribute
 * Iter 43 — meta badges: slightly larger padding, better border radius
 * Iter 44 — gradient placeholder: more vibrant and varied
 * Iter 45 — title: responsive line-clamp on very small screens
 */
export const TripHero = memo(function TripHero({
  title,
  description,
  startDate,
  endDate,
  baseCurrency,
  coverImageUrl,
  onEdit,
  onDelete,
  isDeleting,
  className,
}: TripHeroProps) {
  const totalDays = Math.max(
    1,
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ) + 1
  );

  const hasCover = Boolean(coverImageUrl);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        // Iter 41 — taller min-height on all screen sizes
        "min-h-[220px] sm:min-h-[260px] md:min-h-[280px]",
        className,
      )}
    >
      {/* ── Background ── */}
      {hasCover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Iter 44 — stronger gradient: covers more of image for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </>
      ) : (
        /* Iter 44 — richer gradient placeholder */
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[hsl(250,70%,50%)] to-[hsl(185,80%,40%)] opacity-90" />
      )}

      {/* ── Action buttons — top-right — Iter 42: tooltip, larger hit area ── */}
      {(onEdit || onDelete) && (
        <div className="absolute right-3 top-3 z-20 flex gap-1.5 sm:right-5 sm:top-4">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Edit trip"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/35 text-white backdrop-blur-md hover:bg-black/55 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Edit trip"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              title={isDeleting ? "Deleting…" : "Delete trip"}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/35 text-white backdrop-blur-md hover:bg-red-500/75 transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label={isDeleting ? "Deleting trip…" : "Delete trip"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Content — bottom-left anchored ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="mx-auto w-full max-w-6xl px-4 pb-5 sm:px-6 md:px-8 md:pb-7">

          {/* Iter 45 — destination line */}
          {description && (
            <div className={cn(
              "mb-1.5 flex items-center gap-1.5 text-sm",
              hasCover ? "text-white/80" : "text-white/80",
            )}>
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
              <span className="line-clamp-1 opacity-90">{description}</span>
            </div>
          )}

          {/* Iter 45 — title: responsive sizes, drop-shadow for legibility */}
          <h1 className="text-2xl font-bold tracking-tight font-heading sm:text-3xl md:text-4xl drop-shadow-sm text-white line-clamp-2">
            {title}
          </h1>

          {/* Iter 43 — Meta badges row: slightly larger, better rounded */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm">
              <Calendar className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              {formatDateRange(startDate, endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm">
              <Clock className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              {totalDays} day{totalDays !== 1 ? "s" : ""}
            </span>
            {baseCurrency && (
              <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm">
                <CreditCard className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                {baseCurrency}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
