"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  MapPin,
  StickyNote,
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

const TYPE_ICON = {
  location: MapPin,
  note: StickyNote,
  todo: ListChecks,
}

export function ActivityCard({ activity, onEdit, onDelete, isDeleting }: Props) {
  const [expanded, setExpanded] = useState(true)
  const Icon = TYPE_ICON[activity.type]

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
            <h3 className="font-medium">{activity.title}</h3>
            {activity.type === "location" && activity.start_time && (
              <span className="text-xs text-muted-foreground">
                {activity.start_time}
                {activity.end_time ? ` – ${activity.end_time}` : ""}
              </span>
            )}
          </div>
          {expanded && <ActivityBody activity={activity} />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Delete activity"
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
    </div>
  )
}

function ActivityBody({ activity }: { activity: Activity }) {
  if (!activity.payload) return null

  switch (activity.type) {
    case "location": {
      const p = activity.payload as LocationPayload
      return (
        <div className="text-sm text-muted-foreground">
          {p.location_name && <p>{p.location_name}</p>}
          {p.address && <p className="text-xs">{p.address}</p>}
          {p.notes && <p className="mt-1 whitespace-pre-wrap">{p.notes}</p>}
        </div>
      )
    }
    case "note": {
      const p = activity.payload as NotePayload
      return (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {p.content}
        </p>
      )
    }
    case "todo": {
      const p = activity.payload as TodoPayload
      return (
        <ul className="text-sm">
          {p.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.completed}
                readOnly
                className="h-3 w-3"
              />
              <span
                className={
                  item.completed ? "line-through text-muted-foreground" : ""
                }
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
