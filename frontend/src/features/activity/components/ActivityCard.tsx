"use client"

import { AlertTriangle, ExternalLink, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { buildMapsPinUrl } from "@/features/trip/lib/mapsUrl"
import { formatActivityTimeRange } from "../lib/time"
import { normalizeExternalUrl } from "../lib/externalUrl"
import type { Activity, LocationPayload, NotePayload, TodoPayload } from "../types"

/** True when the stored external URL is a Google Maps link worth reopening directly. */
function isGoogleMapsUrl(url: string | null): url is string {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === "google.com" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com") ||
      host === "goo.gl" ||
      host.endsWith(".goo.gl")
  } catch {
    return false
  }
}

interface Props {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  overlapTitles?: string[]
  /** Highlighted because it is selected on the map. */
  selected?: boolean
  /** Click on the card body (e.g. to focus it on the map). */
  onSelect?: () => void
}

const MENU_ITEM = "min-h-10 px-3 text-sm"

/** One activity on the day timeline: title, one meta line, type-specific body, ⋯ menu. */
export function ActivityCard({
  activity,
  onEdit,
  onDelete,
  isDeleting,
  overlapTitles = [],
  selected = false,
  onSelect,
}: Props) {
  const hasOverlap = overlapTitles.length > 0
  const timeLabel = activity.type === "location" ? formatActivityTimeRange(activity.start_time, activity.end_time) : null
  const location = activity.type === "location" ? (activity.payload as LocationPayload | null) : null
  const needsReview = location?.location_verification === "needs_review"
  const todo = activity.type === "todo" ? (activity.payload as TodoPayload | null) : null
  const todoMeta = todo ? `${todo.items.filter((i) => i.completed).length} / ${todo.items.length} done` : null
  const meta = [timeLabel, todoMeta].filter(Boolean).join(" · ")

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-card px-4 py-3 transition-shadow",
        onSelect && "cursor-pointer hover:shadow-card",
        selected && "ring-2 ring-primary",
        hasOverlap && !selected && "border-warning/60",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug text-foreground">{activity.title}</h4>
          {meta && <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{meta}</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${activity.title}`}
            onClick={(e) => e.stopPropagation()}
            className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "-mr-2 -mt-1 shrink-0 text-muted-foreground" })}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className={MENU_ITEM} onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} variant="destructive" disabled={isDeleting} onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasOverlap && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-foreground" role="note">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span>{formatOverlapMessage(overlapTitles)}</span>
        </p>
      )}

      {needsReview && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-warning/50 bg-warning-bg px-3 text-xs font-semibold text-foreground hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
          Review location
        </button>
      )}

      <ActivityBody activity={activity} />
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
      const needsReview = p.location_verification === "needs_review"
      const mapsHref =
        !needsReview && p.lat != null && p.lng != null
          ? isGoogleMapsUrl(externalUrl)
            ? externalUrl
            : buildMapsPinUrl(p.lat, p.lng, p.location_name)
          : null
      return (
        <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
          {(p.location_name || p.address) && (
            <p className="flex items-start gap-1.5">
              <span className="min-w-0 flex-1">
                {p.location_name && <span className="text-foreground/80">{p.location_name}</span>}
                {p.location_name && p.address && <span aria-hidden="true"> · </span>}
                {p.address && <span className="text-xs">{p.address}</span>}
              </span>
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Google Maps"
                  onClick={(e) => e.stopPropagation()}
                  className="-my-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </p>
          )}
          {p.notes && <p className="whitespace-pre-wrap">{p.notes}</p>}
          {externalUrl && !isGoogleMapsUrl(externalUrl) && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      return <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{p.content}</p>
    }
    case "todo": {
      const p = activity.payload as TodoPayload
      return (
        <ul className="mt-1.5 space-y-1">
          {p.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.completed}
                readOnly
                aria-label={item.text}
                className="h-4 w-4 shrink-0 rounded accent-primary"
              />
              <span className={cn("leading-snug", item.completed ? "text-muted-foreground line-through" : "text-foreground/80")}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )
    }
  }
}
