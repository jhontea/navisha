import { StatusChip } from "@/components/StatusChip"
import type { TimelineStay } from "../../lib/timeline"

/** Read-only stay check-in / check-out entry on a day's timeline (edited in Bookings). */
export function StayTimelineCard({
  a,
  event,
  at,
  aroundTravel = false,
}: {
  a: TimelineStay
  event: "check_in" | "check_out"
  /** "HH:MM" the check-in/out is placed at. */
  at?: string
  /** No time set; it only sits after the arrival / before the departure. */
  aroundTravel?: boolean
}) {
  const meta = [a.location_name, a.confirmation_number && `#${a.confirmation_number}`].filter(Boolean).join(" · ")

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-display text-base font-extrabold text-foreground">{a.name}</p>
        <StatusChip tone={event === "check_in" ? "info" : "neutral"}>
          {event === "check_in" ? "Check-in" : "Check-out"}
          {aroundTravel ? (event === "check_in" ? " after arrival" : " before departure") : at && <span className="tabular-nums"> {at}</span>}
        </StatusChip>
      </div>
      {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
    </div>
  )
}
