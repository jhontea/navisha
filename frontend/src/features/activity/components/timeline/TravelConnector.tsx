import { Car, Footprints } from "lucide-react"

import { cn } from "@/lib/utils"
import { shortDuration, travelLabel, travelText, type TravelLeg } from "../../lib/travel"
import { TimelineRow } from "./TimelineRow"

/** Small line between two timeline cards: "12 min walk", in warning colour when the gap is too short. */
export function TravelConnector({ leg, hidden }: { leg: TravelLeg; hidden?: boolean }) {
  const Icon = leg.mode === "walk" ? Footprints : Car
  const tight = leg.tight && leg.gap_minutes != null
  return (
    // Pulled up into the card row's bottom padding so phones gain little height.
    <TimelineRow className={cn("-mt-2", hidden && "invisible")} icon={null}>
      <p className={cn("flex items-center gap-1.5 text-xs", tight ? "font-semibold text-warning" : "text-muted-foreground")}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span aria-hidden="true">
          {travelText(leg)}
          {tight && ` · Tight: ${shortDuration(leg.gap_minutes ?? 0)} gap`}
        </span>
        <span className="sr-only">{travelLabel(leg)}</span>
      </p>
    </TimelineRow>
  )
}
