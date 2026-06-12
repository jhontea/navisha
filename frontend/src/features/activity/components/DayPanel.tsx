"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { DayActivities } from "./DayActivities"

interface Props {
  dayId: string
  dayNumber: number
  date: string
}

export function DayPanel({ dayId, dayNumber, date }: Props) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-accent/30"
      >
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
          Day {dayNumber}
        </span>
        <span className="text-sm">{formatDate(date)}</span>
        <span className="ml-auto text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="p-3">
          <DayActivities dayId={dayId} />
        </div>
      )}
    </div>
  )
}
