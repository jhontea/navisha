"use client"

import { memo } from "react"
import { Calendar, MapPin, Pencil, Trash2, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accommodation } from "../types"

interface Props {
  accommodation: Accommodation
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const TYPE_CONFIG: Record<string, { emoji: string; bg: string; border: string }> = {
  hotel:     { emoji: "🏨", bg: "bg-blue-500/10",    border: "border-l-blue-400" },
  hostel:    { emoji: "🏠", bg: "bg-green-500/10",   border: "border-l-green-400" },
  apartment: { emoji: "🏢", bg: "bg-violet-500/10",  border: "border-l-violet-400" },
  other:     { emoji: "🛖", bg: "bg-amber-500/10",   border: "border-l-amber-400" },
}

function getTypeConfig(type?: string) {
  if (!type) return TYPE_CONFIG.other
  return TYPE_CONFIG[type.toLowerCase()] ?? TYPE_CONFIG.other
}

/**
 * Accommodation card — Iter 71-75
 * Uses actual Accommodation type fields:
 *   name, accommodation_type, location_name, check_in, check_out,
 *   confirmation_number, notes
 */
export const AccommodationCard = memo(function AccommodationCard({
  accommodation,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const cfg = getTypeConfig(accommodation.accommodation_type)

  const nights =
    accommodation.check_in && accommodation.check_out
      ? Math.max(
          1,
          Math.ceil(
            (new Date(accommodation.check_out).getTime() -
              new Date(accommodation.check_in).getTime()) /
              86400000,
          ),
        )
      : null

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/30 border-l-4 bg-card shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/50",
        cfg.border,
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Iter 71 — type emoji chip */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-transform duration-200 group-hover:scale-110",
            cfg.bg,
          )}
          aria-hidden="true"
        >
          {cfg.emoji}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Name + type badge */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-bold text-foreground leading-snug">
              {accommodation.name}
            </h4>
            {accommodation.accommodation_type && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {accommodation.accommodation_type}
              </span>
            )}
          </div>

          {/* Iter 73 — location */}
          {accommodation.location_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{accommodation.location_name}</span>
            </div>
          )}

          {/* Iter 73 — check-in → check-out with nights count */}
          {(accommodation.check_in || accommodation.check_out) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {accommodation.check_in ?? "?"} → {accommodation.check_out ?? "?"}
              </span>
              {nights !== null && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                  {nights} night{nights !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Iter 78 — confirmation number: monospace pill */}
          {accommodation.confirmation_number && (
            <div className="flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="rounded-md border border-border/40 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">
                {accommodation.confirmation_number}
              </span>
            </div>
          )}

          {/* Notes */}
          {accommodation.notes && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
              {accommodation.notes}
            </p>
          )}
        </div>

        {/* Iter 74 — action buttons: hover reveal on desktop */}
        <div className="flex shrink-0 flex-col gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit accommodation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Delete accommodation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})
