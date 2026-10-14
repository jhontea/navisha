"use client"

import { ChevronDown, ExternalLink, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatWeekdayDate } from "@/lib/calendar"
import { useItineraryFocus } from "@/features/activity/ItineraryFocus"
import { TimelineIcon } from "@/features/activity/components/timeline/TimelineIcon"
import { TimelineRow } from "@/features/activity/components/timeline/TimelineRow"
import { StayTimelineCard } from "@/features/activity/components/timeline/StayTimelineCard"
import { TransportTimelineCard } from "@/features/activity/components/timeline/TransportTimelineCard"
import { buildStaticItems, extractTime, interleaveTimeline } from "@/features/activity/lib/timeline"
import { formatActivityTimeRange } from "@/features/activity/lib/time"
import { normalizeExternalUrl } from "@/features/activity/lib/externalUrl"
import { buildMapsPinUrl, hasValidCoords } from "../../lib/mapsUrl"
import { dayContentSummary } from "../../lib/sharedTrip"
import type { PublicAccommodation, PublicTransportation, PublicTripActivity, PublicTripDay } from "../../types"

/**
 * One day of a shared trip: a header that opens or closes the day, and a
 * read-only timeline with transport and stays placed between activities by
 * time (same rule as the itinerary). A closed day keeps its timeline in the
 * page, hidden.
 */
export function SharedDay({
  day,
  transportations,
  accommodations,
  open,
  onOpenChange,
}: {
  day: PublicTripDay
  transportations: PublicTransportation[]
  accommodations: PublicAccommodation[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { activeDayId, setActiveDayId, selectedActivityId, selectActivity } = useItineraryFocus()
  const entries = interleaveTimeline(day.activities, buildStaticItems(transportations, accommodations, day.date))
  const isActive = activeDayId === day.id
  const summary = dayContentSummary(day)

  return (
    <section
      id={`day-${day.id}`}
      aria-labelledby={`day-heading-${day.id}`}
      className={cn("scroll-mt-20 rounded-xl border bg-card", isActive && open && "lg:border-primary/40")}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- collapsible day header; opening it also focuses the map on this day */}
      <button
        type="button"
        onClick={() => {
          if (!open) setActiveDayId(day.id)
          onOpenChange(!open)
        }}
        aria-expanded={open}
        aria-controls={`day-panel-${day.id}`}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span id={`day-heading-${day.id}`} className="text-base font-semibold text-foreground">
            Day {day.day_number}
            <span className="font-normal text-muted-foreground"> · {formatWeekdayDate(day.date)}</span>
          </span>
          {day.title && <span className="text-sm text-muted-foreground">{day.title}</span>}
          {!open && summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div id={`day-panel-${day.id}`} hidden={!open} className="border-t px-2 pb-1 pt-3 sm:px-4">
        {entries.length === 0 ? (
          <p className="pb-3 pl-2 text-sm text-muted-foreground">Nothing planned for this day.</p>
        ) : (
          entries.map((entry) => {
            if (entry.kind === "activity") {
              const a = entry.activity
              if (a.type === "note") {
                return (
                  <TimelineRow key={a.id} time={a.start_time?.slice(0, 5) || null} icon={<TimelineIcon kind="note" />}>
                    <div id={`activity-${a.id}`} className="rounded-xl border bg-card px-4 py-3">
                      <h3 className="text-sm font-semibold leading-snug text-foreground">{a.title}</h3>
                      {a.payload.content && (
                        <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{a.payload.content}</p>
                      )}
                    </div>
                  </TimelineRow>
                )
              }
              return (
                <TimelineRow key={a.id} time={a.start_time?.slice(0, 5) || null} icon={<TimelineIcon kind="location" />}>
                  <SharedActivityCard
                    activity={a}
                    selected={selectedActivityId === a.id}
                    onSelect={() => {
                      setActiveDayId(day.id)
                      selectActivity(selectedActivityId === a.id ? null : a.id)
                    }}
                  />
                </TimelineRow>
              )
            }
            if (entry.kind === "transport") {
              return (
                <TimelineRow
                  key={`trans-${entry.data.id}`}
                  time={extractTime(entry.data.departure_datetime)}
                  icon={<TimelineIcon kind="transport" transportType={entry.data.type} />}
                >
                  <TransportTimelineCard t={entry.data} />
                </TimelineRow>
              )
            }
            return (
              <TimelineRow key={`stay-${entry.data.id}-${entry.event}`} time={null} icon={<TimelineIcon kind="stay" />}>
                <StayTimelineCard a={entry.data} event={entry.event} />
              </TimelineRow>
            )
          })
        )}
      </div>
    </section>
  )
}

function SharedActivityCard({
  activity,
  selected,
  onSelect,
}: {
  activity: PublicTripActivity
  selected: boolean
  onSelect: () => void
}) {
  const p = activity.payload
  const time = formatActivityTimeRange(activity.start_time || undefined, activity.end_time || undefined)
  const place = [p.location_name, p.address].filter(Boolean).join(" · ")
  const mapsHref = hasValidCoords(p.lat, p.lng) ? buildMapsPinUrl(p.lat!, p.lng!, p.location_name) : null
  const website = p.external_url ? normalizeExternalUrl(p.external_url) : null

  return (
    <div
      id={`activity-${activity.id}`}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-card",
        selected && "ring-2 ring-primary",
      )}
    >
      <h3 className="text-sm font-semibold leading-snug text-foreground">{activity.title}</h3>
      {time && <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{time}</p>}
      {place && <p className="mt-1.5 text-sm text-muted-foreground">{place}</p>}
      {(mapsHref || website) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Google Maps
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Website
            </a>
          )}
        </div>
      )}
    </div>
  )
}
