"use client"

import { memo, type ComponentType } from "react"
import {
  ArrowRight,
  Boxes,
  Bus,
  Car,
  Clock,
  Hash,
  Pencil,
  Plane,
  Ship,
  TramFront,
  Train,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Transportation } from "../types"

interface Props {
  transportation: Transportation
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const TRANSPORT_ICON: Record<string, ComponentType<{ className?: string }>> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

const TRANSPORT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  flight: { bg: "bg-chromatic-aurora/10", text: "text-chromatic-aurora", border: "border-l-chromatic-aurora" },
  train: { bg: "bg-primary/10", text: "text-primary", border: "border-l-primary" },
  bus: { bg: "bg-chromatic-ocean/10", text: "text-chromatic-ocean", border: "border-l-chromatic-ocean" },
  ferry: { bg: "bg-chromatic-sky/10", text: "text-chromatic-sky", border: "border-l-chromatic-sky" },
  ship: { bg: "bg-chromatic-ice/10", text: "text-chromatic-ice", border: "border-l-chromatic-ice" },
  car: { bg: "bg-chromatic-amber/10", text: "text-chromatic-amber", border: "border-l-chromatic-amber" },
  other: { bg: "bg-muted", text: "text-muted-foreground", border: "border-l-border" },
}

function getStyle(type?: string) {
  const key = type?.toLowerCase() ?? "other"
  return TRANSPORT_COLOR[key] ?? TRANSPORT_COLOR.other
}

function formatTime(dt?: string | null): string | null {
  if (!dt) return null
  const m = dt.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}

function formatDate(dt?: string | null): string | null {
  if (!dt) return null
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export const TransportationCard = memo(function TransportationCard({
  transportation,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const type = transportation.type?.toLowerCase() ?? "other"
  const Icon = TRANSPORT_ICON[type] ?? TRANSPORT_ICON.other
  const style = getStyle(transportation.type)

  const depTime = formatTime(transportation.departure_datetime)
  const arrTime = formatTime(transportation.arrival_datetime)
  const depDate = formatDate(transportation.departure_datetime)

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/30 border-l-4 bg-card shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/50",
        style.border,
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            style.bg,
            style.text,
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {transportation.type}
            </span>
            {(transportation.label || transportation.operator) && (
              <span className="truncate text-xs font-semibold text-foreground/80">
                {transportation.label || transportation.operator}
              </span>
            )}
            {transportation.label && transportation.operator && (
              <span className="truncate text-xs text-muted-foreground">
                {transportation.operator}
              </span>
            )}
          </div>

          {(transportation.from_location || transportation.to_location) && (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground leading-snug">
                  {transportation.from_location || "-"}
                </p>
                {depTime && (
                  <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                    <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                    {depTime}
                    {depDate && <span className="ml-0.5">- {depDate}</span>}
                  </p>
                )}
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-xs font-semibold text-foreground leading-snug">
                  {transportation.to_location || "-"}
                </p>
                {arrTime && (
                  <p className="flex items-center justify-end gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                    <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                    {arrTime}
                  </p>
                )}
              </div>
            </div>
          )}

          {transportation.reference_number && (
            <div className="flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="rounded-md border border-border/40 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">
                {transportation.reference_number}
              </span>
            </div>
          )}

          {transportation.notes && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
              {transportation.notes}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit transportation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Delete transportation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})
