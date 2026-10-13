import { ArrowRight } from "lucide-react"

import type { Transportation } from "@/features/transportation/types"
import { extractTime } from "../../lib/timeline"
import { transportIcon } from "./transportIcon"

/** Read-only transport entry on a day's timeline. */
export function TransportTimelineCard({ t }: { t: Transportation }) {
  const Icon = transportIcon(t.type)
  const depTime = extractTime(t.departure_datetime)
  const arrTime = extractTime(t.arrival_datetime)

  return (
    <div className="rounded-2xl border-l-4 border-l-primary border border-border/30 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Transport
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-primary">
              <Icon className="h-3 w-3" />
              {t.type}
            </span>
            {depTime && (
              <span className="text-xs text-muted-foreground">· {depTime}</span>
            )}
          </div>
          {(t.from_location || t.to_location) && (
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span>{t.from_location || "—"}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{t.to_location || "—"}</span>
            </div>
          )}
          {t.label && (
            <p className="text-sm text-foreground/80">{t.label}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {t.operator && <span>{t.operator}</span>}
            {t.reference_number && <span className="font-mono">#{t.reference_number}</span>}
            {depTime && arrTime && <span>{depTime} → {arrTime}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
