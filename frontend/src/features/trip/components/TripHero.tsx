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
        "min-h-[180px] max-[380px]:min-h-[220px] sm:min-h-[220px] md:h-[240px]",
        "-mt-4 md:mt-0 md:max-w-max-width md:mx-auto md:rounded-2xl",
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

      {/* ── Content — bottom anchored ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="mx-auto w-full max-w-max-width px-4 pb-5 max-[380px]:pb-4 sm:px-6 md:px-8 md:pb-7">

          {/* Title row: title + action buttons inline */}
          <div className="flex items-start justify-between gap-2 min-[390px]:gap-3">
            <div className="min-w-0">
              {description && (
                <div className={cn(
                  "mb-1.5 flex items-center gap-1.5 text-sm max-[380px]:text-xs",
                  "text-white/80",
                )}>
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
                  <span className="line-clamp-1 opacity-90">{description}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold leading-tight tracking-tight font-heading max-[380px]:text-[1.45rem] sm:text-3xl md:text-4xl drop-shadow-sm text-white line-clamp-2">
                {title}
              </h1>
            </div>

            {(onEdit || onDelete) && (
              <div className="flex shrink-0 gap-1.5 pt-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    title="Edit trip"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/35 text-white backdrop-blur-md hover:bg-black/55 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 min-[390px]:h-9 min-[390px]:w-9"
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
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/35 text-white backdrop-blur-md hover:bg-red-500/75 transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 min-[390px]:h-9 min-[390px]:w-9"
                    aria-label={isDeleting ? "Deleting trip…" : "Delete trip"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Meta badges row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 min-[390px]:gap-2">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm min-[390px]:px-3 min-[390px]:text-xs">
              <Calendar className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              <span className="truncate">{formatDateRange(startDate, endDate)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm min-[390px]:px-3 min-[390px]:text-xs">
              <Clock className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              {totalDays} day{totalDays !== 1 ? "s" : ""}
            </span>
            {baseCurrency && (
              <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-sm bg-black/30 text-white/90 border border-white/15 shadow-sm min-[390px]:px-3 min-[390px]:text-xs">
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
