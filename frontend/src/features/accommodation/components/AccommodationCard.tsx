"use client"

import { memo, type ComponentType } from "react"
import { Bed, Building2, Hotel, House, MapPin } from "lucide-react"

import { BookingCard } from "@/components/BookingCard"
import { StatusChip } from "@/components/StatusChip"
import { formatWeekdayDate, nightsBetween, tripDayRange } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { ACCOMMODATION_TYPE_LABELS, type Accommodation } from "../types"

interface Props {
  accommodation: Accommodation
  days?: { date: string; day_number: number }[]
  /** Formatted cost of the linked expense, when the stay has one. */
  cost?: string | null
  onEdit: () => void
  onDelete: () => void
}

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  hotel: Hotel,
  hostel: House,
  apartment: Building2,
  other: Bed,
}

/**
 * One stay: name and type, address, then check-in → check-out laid out like
 * the transport boarding pass (dates under their side, nights in between),
 * and trip days / booking ref on a row below.
 */
export const AccommodationCard = memo(function AccommodationCard({
  accommodation: a,
  days = [],
  cost,
  onEdit,
  onDelete,
}: Props) {
  const type = a.accommodation_type?.toLowerCase() ?? "other"
  const nights = nightsBetween(a.check_in, a.check_out)
  const range = tripDayRange(a.check_in, a.check_out, days)
  const dayRange = range ? (range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`) : null

  const facts = [
    { label: dayRange?.includes("–") ? "Trip days" : "Trip day", value: dayRange },
    { label: "Booking ref", value: a.confirmation_number || null },
    { label: "Cost", value: cost || null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value))

  return (
    <BookingCard
      icon={TYPE_ICON[type] ?? Bed}
      title={a.name}
      badge={<StatusChip tone="info">{ACCOMMODATION_TYPE_LABELS[type as keyof typeof ACCOMMODATION_TYPE_LABELS] ?? "Stay"}</StatusChip>}
      subtitle={
        a.location_name ? (
          <span className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{a.location_name}</span>
          </span>
        ) : undefined
      }
      actionsLabel={`Actions for ${a.name}`}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
        <StayEnd label="Check-in" date={formatWeekdayDate(a.check_in)} time={a.check_in_time} timePrefix="from" />
        <div className="flex min-w-8 flex-1 items-center gap-1 text-muted-foreground">
          <span className="h-px flex-1 border-t-2 border-dotted border-current" aria-hidden="true" />
          {nights !== null && (
            <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-foreground">
              {nights} {nights === 1 ? "night" : "nights"}
            </span>
          )}
          <span className="h-px flex-1 border-t-2 border-dotted border-current" aria-hidden="true" />
        </div>
        <StayEnd label="Check-out" date={formatWeekdayDate(a.check_out)} time={a.check_out_time} timePrefix="by" align="end" />
      </div>
      {facts.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 px-1">
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 items-baseline gap-1.5">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="truncate text-sm font-bold text-foreground tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {a.notes && (
        // Padding on the wrapper: on the clamped element it would show a sliver of the 4th line.
        <div className="mt-3 rounded-xl bg-muted px-3 py-2">
          <p className="line-clamp-3 text-sm text-muted-foreground">{a.notes}</p>
        </div>
      )}
    </BookingCard>
  )
})

function StayEnd({
  label,
  date,
  time,
  timePrefix,
  align = "start",
}: {
  label: string
  date: string | null
  time: string | null | undefined
  timePrefix: string
  align?: "start" | "end"
}) {
  const clock = time?.slice(0, 5)
  return (
    <div className={cn("min-w-0 shrink-0", align === "end" && "text-right")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground tabular-nums">{date ?? "—"}</p>
      {clock && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {timePrefix} {clock}
        </p>
      )}
    </div>
  )
}
