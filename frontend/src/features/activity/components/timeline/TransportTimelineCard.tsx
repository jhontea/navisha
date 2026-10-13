import { ArrowRight } from "lucide-react"

import { transportTypeLabel } from "@/features/transportation/lib/transportType"
import { extractTime, type TimelineTransport } from "../../lib/timeline"

/** Read-only transport entry on a day's timeline (edited in Bookings). */
export function TransportTimelineCard({ t }: { t: TimelineTransport }) {
  const depTime = extractTime(t.departure_datetime)
  const arrTime = extractTime(t.arrival_datetime)
  const heading = [transportTypeLabel(t.type), t.label].filter(Boolean).join(" · ")
  const meta = [t.operator, t.reference_number && `#${t.reference_number}`, depTime && arrTime && `${depTime} → ${arrTime}`]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{heading}</p>
      {(t.from_location || t.to_location) && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-foreground">
          <span>{t.from_location || "—"}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="to" />
          <span>{t.to_location || "—"}</span>
        </p>
      )}
      {meta && <p className="mt-1 text-xs text-muted-foreground tabular-nums">{meta}</p>}
    </div>
  )
}
