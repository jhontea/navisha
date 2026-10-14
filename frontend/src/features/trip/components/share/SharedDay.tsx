"use client"

import { ExternalLink, MapPin } from "lucide-react"

import { StatusChip } from "@/components/StatusChip"
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
 * The selected day of a shared trip (one day at a time, like the itinerary):
 * two-tone header and a read-only timeline with transport and stays placed
 * between activities by time (same rule as the itinerary).
 */
export function SharedDay({
  day,
  transportations,
  accommodations,
}: {
  day: PublicTripDay
  transportations: PublicTransportation[]
  accommodations: PublicAccommodation[]
}) {
  const { setActiveDayId, selectedActivityId, selectActivity } = useItineraryFocus()
  const entries = interleaveTimeline(day.activities, buildStaticItems(transportations, accommodations, day.date))
  const summary = dayContentSummary(day)

  return (
    <section id={`day-${day.id}`} aria-labelledby={`day-heading-${day.id}`} className="scroll-mt-20 rounded-2xl border bg-card shadow-card">
      <div className="flex items-start gap-3 px-4 pb-1 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id={`day-heading-${day.id}`} className="font-display text-xl font-extrabold leading-tight text-foreground">
            Day {day.day_number}
            <span className="text-muted-foreground"> · {formatWeekdayDate(day.date)}</span>
          </h2>
          {day.title && <p className="mt-0.5 text-sm font-semibold text-muted-foreground">{day.title}</p>}
        </div>
        {summary && <StatusChip tone="info">{summary}</StatusChip>}
      </div>

      <div id={`day-panel-${day.id}`} className="px-2 pb-3 pt-3 sm:px-5">
        {entries.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">Nothing planned for this day.</p>
        ) : (
          entries.map((entry) => {
            if (entry.kind === "activity") {
              const a = entry.activity
              if (a.type === "note") {
                return (
                  <TimelineRow key={a.id} time={a.start_time?.slice(0, 5) || null} icon={<TimelineIcon kind="note" />}>
                    <div id={`activity-${a.id}`} className="rounded-xl border bg-card px-4 py-3">
                      <h3 className="font-display text-base font-extrabold leading-snug text-foreground">{a.title}</h3>
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
        "cursor-pointer rounded-xl border bg-card px-4 py-3 transition-[box-shadow,background-color] hover:shadow-card",
        selected && "border-primary/40 bg-primary-soft/50 shadow-card ring-1 ring-primary/40",
      )}
    >
      <h3 className="font-display text-base font-extrabold leading-snug text-foreground">{activity.title}</h3>
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
