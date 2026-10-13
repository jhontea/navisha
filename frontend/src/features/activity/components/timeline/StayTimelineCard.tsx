import { LogIn, LogOut } from "lucide-react"

import type { Accommodation } from "@/features/accommodation/types"
import { cn } from "@/lib/utils"

/** Read-only stay check-in / check-out entry on a day's timeline. */
export function StayTimelineCard({
  a,
  event,
}: {
  a: Accommodation
  event: "check_in" | "check_out"
}) {
  const isCheckin = event === "check_in"
  const EventIcon = isCheckin ? LogIn : LogOut

  return (
    <div className="rounded-2xl border-l-4 border-l-chromatic-aurora border border-border/30 bg-chromatic-aurora/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-chromatic-aurora">
              Stay
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                isCheckin
                  ? "bg-chromatic-aurora/10 text-chromatic-aurora"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <EventIcon className="h-3 w-3" />
              {isCheckin ? "Check-in" : "Check-out"}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground">{a.name}</h4>
          {a.location_name && (
            <p className="text-xs text-muted-foreground">{a.location_name}</p>
          )}
          {a.confirmation_number && (
            <p className="text-xs font-mono text-muted-foreground">#{a.confirmation_number}</p>
          )}
        </div>
      </div>
    </div>
  )
}
