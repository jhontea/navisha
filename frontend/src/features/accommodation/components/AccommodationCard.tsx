"use client"

import { Hotel, Trash2 } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import type { Accommodation } from "../types"

interface Props {
  accommodation: Accommodation
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function AccommodationCard({
  accommodation: a,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
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
        <Hotel className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <h3 className="font-medium">{a.name}</h3>
          {a.location_name && (
            <p className="text-sm text-muted-foreground">{a.location_name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDate(a.check_in)} — {formatDate(a.check_out)}
          </p>
          {a.confirmation_number && (
            <p className="text-xs text-muted-foreground">
              Ref: {a.confirmation_number}
            </p>
          )}
          {a.notes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {a.notes}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Delete accommodation"
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
