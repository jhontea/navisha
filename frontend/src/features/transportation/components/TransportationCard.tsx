"use client"

import {
  Bus,
  Car,
  Pencil,
  Plane,
  Ship,
  Train,
  TramFront,
  Boxes,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Transportation } from "../types"

const TYPE_ICON: Record<string, typeof Plane> = {
  flight: Plane,
  bus: Bus,
  train: Train,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

// Background + text color per type
const TYPE_COLOR: Record<string, string> = {
  flight: "bg-[#DBEAFE] text-primary",
  bus: "bg-muted text-muted-foreground",
  train: "bg-secondary/10 text-secondary",
  ferry: "bg-[#EDE9FE] text-[#7C3AED]",
  ship: "bg-[#EDE9FE] text-[#7C3AED]",
  car: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
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
  const Icon = TYPE_ICON[t.type] ?? Boxes
  const iconBg = TYPE_COLOR[t.type] ?? TYPE_COLOR.other

  // departure_datetime is stored as UTC but represents the user's intended local time.
  // Strip timezone suffix and parse as local to avoid double-shifting.
  const depTime = t.departure_datetime
    ? (() => {
        const bare = t.departure_datetime!.replace(/Z$|[+-]\d{2}:\d{2}$/, "")
        const d = new Date(bare)
        return isNaN(d.getTime()) ? null : d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      })()
    : null

  return (
    <div className="group bg-card border-l-4 border-l-primary rounded-xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:shadow-md transition-shadow">
      {/* Left: icon + route */}
      <div className="flex items-center gap-5">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            iconBg,
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div>
          {(t.from_location || t.to_location) ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {t.from_location || "—"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span className="text-lg font-bold text-foreground">
                {t.to_location || "—"}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-foreground capitalize">
              {t.type}
            </span>
          )}
          {t.label && (
            <p className="text-sm font-medium text-foreground/80 mt-0.5">
              {t.label}
            </p>
          )}
          {t.operator && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.operator}
            </p>
          )}
        </div>
      </div>

      {/* Departure */}
      {depTime && (
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Departure
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{depTime}</p>
        </div>
      )}

      {/* Label display */}
      {t.label && (
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Label
          </p>
          <p className="text-sm font-semibold text-primary font-mono mt-0.5">
            {t.label}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Edit transportation"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Delete transportation"
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
