"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/utils"
import { useUpdateDayNotes } from "@/features/trip/hooks/useTrips"
import { DayActivities } from "./DayActivities"

interface Props {
  tripId: string
  dayId: string
  dayNumber: number
  date: string
  notes: string
}

export function DayPanel({ tripId, dayId, dayNumber, date, notes }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [draft, setDraft] = useState(notes)
  const { mutate, isPending } = useUpdateDayNotes(tripId)

  // Save on blur — only when text actually changed, avoids no-op PUTs.
  const onBlur = () => {
    if (draft !== notes) {
      mutate({ dayId, notes: draft })
    }
  }

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
        <div className="flex flex-col gap-4 p-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Day notes</Label>
              {isPending && (
                <span className="text-[10px] text-muted-foreground">
                  Saving…
                </span>
              )}
            </div>
            <Textarea
              rows={2}
              placeholder="Reminders, weather, anything to remember for this day…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={onBlur}
            />
          </div>
          <DayActivities dayId={dayId} />
        </div>
      )}
    </div>
  )
}
