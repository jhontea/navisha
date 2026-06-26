"use client"

import {
  ListChecks,
  MapPin,
  StickyNote,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Activity,
  LocationPayload,
  NotePayload,
  TodoPayload,
} from "../types"

interface Props {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const TYPE_CONFIG = {
  location: {
    Icon: MapPin,
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-primary",
    borderColor: "border-l-primary",
    label: "Location",
    labelColor: "text-primary",
  },
  note: {
    Icon: StickyNote,
    iconBg: "bg-[#E0E7FF]",
    iconColor: "text-indigo-600",
    borderColor: "border-l-indigo-400",
    label: "Note",
    labelColor: "text-indigo-600",
  },
  todo: {
    Icon: ListChecks,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    borderColor: "border-l-muted-foreground/30",
    label: "Todo",
    labelColor: "text-muted-foreground",
  },
}

export function ActivityCard({ activity, onEdit, onDelete, isDeleting }: Props) {
  const config = TYPE_CONFIG[activity.type]

  return (
    <div
      className={cn(
        "glass group relative rounded-xl border-l-4 p-5 transition-all",
        "hover:translate-x-0.5 hover:bg-white/25",
        config.borderColor,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1.5">
          {/* Type label + time */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider",
                config.labelColor,
              )}
            >
              {config.label}
            </span>
            {activity.type === "location" && activity.start_time && (
              <span className="text-xs text-muted-foreground">
                · {activity.start_time}
                {activity.end_time ? ` – ${activity.end_time}` : ""}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-base font-semibold text-foreground">
            {activity.title}
          </h4>

          {/* Type-specific body */}
          <ActivityBody activity={activity} />
        </div>

        {/* Actions — always visible */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Edit activity"
            onClick={onEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete activity"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ActivityBody({ activity }: { activity: Activity }) {
  if (!activity.payload) return null

  switch (activity.type) {
    case "location": {
      const p = activity.payload as LocationPayload
      return (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          {p.location_name && (
            <p className="font-medium text-foreground/80">{p.location_name}</p>
          )}
          {p.address && <p className="text-xs">{p.address}</p>}
          {p.notes && (
            <p className="mt-1 whitespace-pre-wrap text-sm">{p.notes}</p>
          )}
        </div>
      )
    }
    case "note": {
      const p = activity.payload as NotePayload
      return (
        <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
          {p.content}
        </p>
      )
    }
    case "todo": {
      const p = activity.payload as TodoPayload
      return (
        <ul className="space-y-1">
          {p.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.completed}
                readOnly
                className="h-3.5 w-3.5 rounded border-muted-foreground/30 accent-primary"
              />
              <span
                className={cn(
                  item.completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground/80",
                )}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )
    }
  }
}
