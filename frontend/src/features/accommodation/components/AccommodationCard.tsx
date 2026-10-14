"use client"

import { memo, type ComponentType } from "react"
import { Bed, Building2, Hotel, House, MapPin } from "lucide-react"

import { BookingCard } from "@/components/BookingCard"
import { FactBox } from "@/components/FactBox"
import { StatusChip } from "@/components/StatusChip"
import { formatWeekdayDate, nightsBetween, tripDayNumber } from "@/lib/calendar"
import { ACCOMMODATION_TYPE_LABELS, type Accommodation } from "../types"

interface Props {
  accommodation: Accommodation
  days?: { date: string; day_number: number }[]
  onEdit: () => void
  onDelete: () => void
}

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  hotel: Hotel,
  hostel: House,
  apartment: Building2,
  other: Bed,
}

/** One stay: name and type, address, then check-in / check-out / nights / days as fact boxes. */
export const AccommodationCard = memo(function AccommodationCard({
  accommodation: a,
  days = [],
  onEdit,
  onDelete,
}: Props) {
  const type = a.accommodation_type?.toLowerCase() ?? "other"
  const nights = nightsBetween(a.check_in, a.check_out)
  const firstDay = tripDayNumber(a.check_in, days)
  const lastDay = tripDayNumber(a.check_out, days)
  const dayRange =
    firstDay !== null && lastDay !== null && lastDay !== firstDay
      ? `${firstDay}–${lastDay}`
      : firstDay !== null
        ? String(firstDay)
        : null

  const facts = [
    { label: "Check-in", value: formatWeekdayDate(a.check_in) },
    { label: "Check-out", value: formatWeekdayDate(a.check_out) },
    { label: "Nights", value: nights !== null ? String(nights) : null },
    { label: "Trip days", value: dayRange },
    { label: "Booking ref", value: a.confirmation_number || null },
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
      {facts.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {facts.map((f) => (
            <FactBox key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      )}
      {a.notes && <p className="mt-3 line-clamp-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{a.notes}</p>}
    </BookingCard>
  )
})
