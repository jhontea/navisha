"use client"

import {
  ArrowRight,
  Bus,
  Car,
  Plane,
  Ship,
  Train,
  TramFront,
  Boxes,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Transportation } from "../types"

const TYPE_ICON = {
  flight: Plane,
  bus: Bus,
  train: Train,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

interface Props {
  transportation: Transportation
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function TransportationCard({
  transportation: t,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const Icon = TYPE_ICON[t.type]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onEdit()
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card p-3 transition-colors",
        "hover:border-primary/40 hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t.type}</Badge>
            {t.label && <h3 className="font-medium">{t.label}</h3>}
            {t.operator && (
              <span className="text-xs text-muted-foreground">
                {t.operator}
              </span>
            )}
          </div>
          {(t.from_location || t.to_location) && (
            <div className="flex items-center gap-2 text-sm">
              <span>{t.from_location || "—"}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>{t.to_location || "—"}</span>
            </div>
          )}
          {(t.departure_datetime || t.arrival_datetime) && (
            <p className="text-xs text-muted-foreground">
              {t.departure_datetime
                ? new Date(t.departure_datetime).toLocaleString()
                : "?"}
              {" → "}
              {t.arrival_datetime
                ? new Date(t.arrival_datetime).toLocaleString()
                : "?"}
            </p>
          )}
          {t.reference_number && (
            <p className="text-xs text-muted-foreground">
              Ref: {t.reference_number}
            </p>
          )}
          {t.notes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {t.notes}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Delete transportation"
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive opacity-0 transition-opacity hover:bg-destructive/10 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
