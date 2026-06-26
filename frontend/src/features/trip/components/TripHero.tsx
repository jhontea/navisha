"use client";

import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateRange } from "@/lib/utils";

interface TripHeroProps {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  baseCurrency?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  className?: string;
}

/** Visual hero banner for trip pages. Gradient background with centered
 *  title + date range + currency. Edit/delete icon buttons top-right. */
export const TripHero = memo(function TripHero({
  title,
  description,
  startDate,
  endDate,
  baseCurrency,
  onEdit,
  onDelete,
  isDeleting,
  className,
}: TripHeroProps) {
  return (
    <div
      className={`relative mx-auto w-full max-w-max-width bg-gradient-to-br from-chromatic-sunset/15 via-chromatic-aurora/8 to-chromatic-sky/10 px-margin-mobile pt-6 pb-3 sm:py-10 md:px-margin-desktop md:py-12 ${className ?? ""}`}
    >
      {/* Action buttons — top-right, inside the padding area */}
      {(onEdit || onDelete) && (
        <div className="absolute right-3 top-3 flex gap-1.5 md:right-6 md:top-4">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="glass flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-white/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chromatic-sunset transition-colors"
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
              className="glass flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              aria-label="Delete trip"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Title + info — right padding on mobile so text clears action buttons */}
      <div className="text-center pr-20 sm:pr-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
          {title}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span>{formatDateRange(startDate, endDate)}</span>
          {baseCurrency && (
            <>
              <span aria-hidden="true">·</span>
              <span>{baseCurrency}</span>
            </>
          )}
        </div>
        {description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
