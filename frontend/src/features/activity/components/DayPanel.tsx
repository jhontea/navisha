"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DayActivities } from "./DayActivities"

interface Props {
  tripId: string
  dayId: string
  dayNumber: number
  date: string
  notes: string
  defaultExpanded?: boolean
}

export function DayPanel({
  tripId,
  dayId,
  dayNumber,
  date,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Format day header date: "Monday, July 15"
  const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div
      className={cn(
        "glass overflow-hidden rounded-2xl border border-border/30 transition-all duration-200",
        expanded ? "shadow-sm" : "",
      )}
    >
      {/* Day header — click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`day-panel-${dayId}`}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/20 active:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        {/* Day number badge */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora text-sm font-bold text-white shadow-sm">
          {dayNumber}
        </span>

        {/* Labels */}
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight">
            Day {dayNumber}
          </span>
          <span className="text-xs text-muted-foreground truncate">{dayLabel}</span>
        </div>

        {/* Chevron — rotates 180° when expanded */}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/*
        Grid-rows animation trick: grid-rows-[0fr] → grid-rows-[1fr]
        This gives a smooth height transition without the janky
        max-height hack (which animates from 2000px → 0 instantly).
      */}
      <div
        id={`day-panel-${dayId}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/20 px-5 pb-5 pt-4">
            <DayActivities
              tripId={tripId}
              dayId={dayId}
              date={date}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
