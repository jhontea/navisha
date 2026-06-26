"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
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
        "glass overflow-hidden rounded-xl transition-all duration-200",
        expanded ? "shadow-chromatic" : "",
      )}
    >
      {/* Day header — click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-chromatic-sunset to-chromatic-sky text-sm font-bold text-white">
          {dayNumber}
        </span>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">
            Day {dayNumber}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">{dayLabel}</span>
        </div>
        <span className="ml-auto shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-2">
          <DayActivities
            tripId={tripId}
            dayId={dayId}
            date={date}
          />
        </div>
      )}
    </div>
  )
}
