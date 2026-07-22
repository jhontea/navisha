"use client"

import {
  ListChecks,
  MapPin,
  StickyNote,
  Pencil,
  Trash2,
  Clock,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatActivityTimeRange } from "../lib/time"
import { normalizeExternalUrl } from "../lib/externalUrl"
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
  overlapTitles?: string[]
}

const TYPE_CONFIG = {
  location: {
    Icon: MapPin,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-l-primary",
    label: "Location",
    badgeBg: "bg-primary/10 text-primary",
  },
  note: {
    Icon: StickyNote,
    iconBg: "bg-chromatic-amber/10",
    iconColor: "text-chromatic-amber",
    borderColor: "border-l-chromatic-amber",
    label: "Note",
    badgeBg: "bg-chromatic-amber/10 text-chromatic-amber",
  },
  todo: {
    Icon: ListChecks,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    borderColor: "border-l-border",
    label: "Todo",
    badgeBg: "bg-muted text-muted-foreground",
  },
}

/**
 * ActivityCard — individual activity within a day.
 * Iter 51 — compact time display with Clock icon
 * Iter 52 — location: external link icon when address is available (opens maps)
 * Iter 53 — todo: show completed count in badge (e.g. "2 / 5")
 * Iter 54 — action buttons: hover states, show on focus too (not just visible)
 * Iter 55 — note: better quote styling with left border accent
 */
export function ActivityCard({
  activity,
  onEdit,
  onDelete,
  isDeleting,
  overlapTitles = [],
}: Props) {
  const config = TYPE_CONFIG[activity.type]
  const hasOverlap = overlapTitles.length > 0
  const timeLabel = formatActivityTimeRange(
    activity.start_time,
    activity.end_time,
  )

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/30 border-l-4 bg-card p-4 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-border/50 hover:-translate-y-0.5",
        config.borderColor,
        hasOverlap && "ring-1 ring-chromatic-amber/30",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5 transition-transform duration-200",
          "group-hover:scale-110",
          config.iconBg,
        )}>
          <config.Icon className={cn("h-4 w-4", config.iconColor)} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Type badge + time — Iter 51 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
              config.badgeBg,
            )}>
              {config.label}
            </span>
            {/* Iter 51 — time with icon */}
            {activity.type === "location" && timeLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                {timeLabel}
              </span>
            )}
            {/* Iter 53 — todo: completed count */}
            {activity.type === "todo" && activity.payload && (
              <span className="text-xs text-muted-foreground">
                {(() => {
                  const p = activity.payload as TodoPayload
                  const done = p.items.filter((i) => i.completed).length
                  return `${done} / ${p.items.length} done`
                })()}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground leading-snug">
            {activity.title}
          </h4>

          {hasOverlap && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-chromatic-amber" role="note">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{formatOverlapMessage(overlapTitles)}</span>
            </p>
          )}

          {/* Type-specific body */}
          <ActivityBody activity={activity} />
        </div>

        {/* Iter 54 — Actions: always visible on mobile, hover/focus on desktop */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            aria-label="Edit activity"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:opacity-100"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatOverlapMessage(titles: string[]): string {
  if (titles.length === 1) return `Overlaps with ${titles[0]}`
  return `Overlaps with ${titles[0]} and ${titles.length - 1} more`
}

function ActivityBody({ activity }: { activity: Activity }) {
  if (!activity.payload) return null

  switch (activity.type) {
    case "location": {
      const p = activity.payload as LocationPayload
      const externalUrl = normalizeExternalUrl(p.external_url ?? "")
      return (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          {p.location_name && (
            <p className="font-medium text-foreground/80 text-sm">{p.location_name}</p>
          )}
          {/* Iter 52 — address with maps link */}
          {p.address && (
            <div className="flex items-start gap-1">
              <p className="text-xs flex-1">{p.address}</p>
              {p.lat && p.lng && (
                <a
                  href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Google Maps"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-primary/60 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
          {p.notes && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground/80">{p.notes}</p>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Open link
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )
    }
    case "note": {
      const p = activity.payload as NotePayload
      return (
        /* Iter 55 — quote styling: left accent border */
        <blockquote className="mt-1 border-l-2 border-chromatic-amber/60 pl-2.5">
          <p className="whitespace-pre-wrap text-sm italic text-muted-foreground leading-relaxed">
            {p.content}
          </p>
        </blockquote>
      )
    }
    case "todo": {
      const p = activity.payload as TodoPayload
      const doneCount = p.items.filter((i) => i.completed).length
      const totalCount = p.items.length
      const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
      return (
        <div className="space-y-2">
          {/* Iter 53 — mini progress bar for todos */}
          {totalCount > 0 && (
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <ul className="space-y-1">
            {p.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.completed}
                  readOnly
                  aria-label={item.text}
                  className="h-3.5 w-3.5 rounded border-muted-foreground/30 accent-primary shrink-0"
                />
                <span
                  className={cn(
                    "leading-snug",
                    item.completed
                      ? "line-through text-muted-foreground/60"
                      : "text-foreground/80",
                  )}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )
    }
  }
}
