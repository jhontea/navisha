"use client"

import { memo } from "react"

import { BookingActions } from "@/components/BookingCard"
import { tripDayNumber } from "@/lib/calendar"
import { transportTypeLabel } from "../lib/transportType"
import type { Transportation } from "../types"
import { BoardingPass } from "./BoardingPass"

interface Props {
  transportation: Transportation
  days?: { date: string; day_number: number }[]
  onEdit: () => void
  onDelete: () => void
}

/** One transport booking as a boarding pass, with the ⋯ menu and its notes. */
export const TransportationCard = memo(function TransportationCard({
  transportation: t,
  days = [],
  onEdit,
  onDelete,
}: Props) {
  const heading = t.label ? `${transportTypeLabel(t.type)} · ${t.label}` : transportTypeLabel(t.type)

  return (
    <BoardingPass
      transportation={t}
      dayNumber={tripDayNumber(t.departure_datetime, days)}
      actions={<BookingActions label={`Actions for ${heading}`} onEdit={onEdit} onDelete={onDelete} className="-mr-1.5" />}
    >
      {t.notes && <p className="mt-3 line-clamp-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{t.notes}</p>}
    </BoardingPass>
  )
})
