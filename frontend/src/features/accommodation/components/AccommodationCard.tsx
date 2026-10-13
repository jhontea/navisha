"use client"

import { memo, type ComponentType } from "react"
import { Bed, Building2, Hotel, House, MapPin } from "lucide-react"

import { BookingCard } from "@/components/BookingCard"
import { formatShortRange, nightsBetween, tripDayNumber } from "@/lib/calendar"
import { ACCOMMODATION_TYPE_LABELS, type Accommodation } from "../types"

interface Props {
  accommodation: Accommodation
  days?: { date: string; day_number: number }[]
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  hotel: Hotel,
  hostel: House,
  apartment: Building2,
  other: Bed,
}

/** One stay: name, type, location and a dates · nights · days meta line. */
export const AccommodationCard = memo(function AccommodationCard({
  accommodation: a,
  days = [],
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const type = a.accommodation_type?.toLowerCase() ?? "other"
  const nights = nightsBetween(a.check_in, a.check_out)
  const firstDay = tripDayNumber(a.check_in, days)
  const lastDay = tripDayNumber(a.check_out, days)
  const dayRange =
    firstDay !== null && lastDay !== null && lastDay !== firstDay
      ? `Day ${firstDay}–${lastDay}`
      : firstDay !== null
        ? `Day ${firstDay}`
        : null
  const meta = [
    formatShortRange(a.check_in, a.check_out),
    nights !== null ? `${nights} ${nights === 1 ? "night" : "nights"}` : null,
    dayRange,
    a.confirmation_number ? `Ref ${a.confirmation_number}` : null,
  ].filter(Boolean)

  return (
    <BookingCard
      icon={TYPE_ICON[type] ?? Bed}
      iconClassName="bg-cat-stay/15 text-cat-stay"
      title={a.name}
      subtitle={ACCOMMODATION_TYPE_LABELS[type as keyof typeof ACCOMMODATION_TYPE_LABELS] ?? "Stay"}
      actionsLabel={`Actions for ${a.name}`}
      onEdit={onEdit}
      onDelete={onDelete}
      isDeleting={isDeleting}
    >
      {a.location_name && (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{a.location_name}</span>
        </p>
      )}
      {meta.length > 0 && <p className="mt-2 text-xs text-muted-foreground tabular-nums">{meta.join(" · ")}</p>}
      {a.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.notes}</p>}
    </BookingCard>
  )
})
