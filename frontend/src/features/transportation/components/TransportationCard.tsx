"use client"

import { memo } from "react"
import { ArrowRight } from "lucide-react"

import { BookingCard } from "@/components/BookingCard"
import { daysBetween, formatClock, formatWeekdayDate, tripDayNumber } from "@/lib/calendar"
import { transportIcon, transportTypeLabel } from "../lib/transportType"
import type { Transportation } from "../types"

interface Props {
  transportation: Transportation
  days?: { date: string; day_number: number }[]
  onEdit: () => void
  onDelete: () => void
}

/** One transport booking: type and label, from → to with times, one meta line. */
export const TransportationCard = memo(function TransportationCard({
  transportation: t,
  days = [],
  onEdit,
  onDelete,
}: Props) {
  const typeLabel = transportTypeLabel(t.type)
  const heading = t.label ? `${typeLabel} · ${t.label}` : typeLabel
  const depTime = formatClock(t.departure_datetime)
  const arrTime = formatClock(t.arrival_datetime)
  const dayShift = daysBetween(t.departure_datetime, t.arrival_datetime)
  const dayNumber = tripDayNumber(t.departure_datetime, days)
  const meta = [
    formatWeekdayDate(t.departure_datetime),
    dayNumber !== null ? `Day ${dayNumber}` : null,
    t.reference_number ? `Ref ${t.reference_number}` : null,
  ].filter(Boolean)

  return (
    <BookingCard
      icon={transportIcon(t.type)}
      iconClassName="bg-cat-transport/15 text-cat-transport"
      title={heading}
      subtitle={t.operator || undefined}
      actionsLabel={`Actions for ${heading}`}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {(t.from_location || t.to_location) && (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
          <div className="min-w-0">
            {depTime && <p className="text-base font-semibold text-foreground tabular-nums">{depTime}</p>}
            <p className="line-clamp-3 text-sm text-muted-foreground">{t.from_location || "—"}</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" aria-label="to" />
          <div className="min-w-0 text-right">
            {arrTime && (
              <p className="text-base font-semibold text-foreground tabular-nums">
                {arrTime}
                {dayShift !== null && dayShift > 0 && (
                  <span className="ml-0.5 align-top text-xs font-medium text-muted-foreground">
                    +{dayShift}
                    <span className="sr-only"> {dayShift === 1 ? "day" : "days"} later</span>
                  </span>
                )}
              </p>
            )}
            <p className="line-clamp-3 text-sm text-muted-foreground">{t.to_location || "—"}</p>
          </div>
        </div>
      )}

      {meta.length > 0 && <p className="mt-2 text-xs text-muted-foreground tabular-nums">{meta.join(" · ")}</p>}
      {t.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.notes}</p>}
    </BookingCard>
  )
})
