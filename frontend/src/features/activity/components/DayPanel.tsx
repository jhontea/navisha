"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, LoaderCircle, Pencil, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpdateDayTitle } from "@/features/trip/hooks/useTrips"
import { DayActivities } from "./DayActivities"

interface Props {
  tripId: string
  dayId: string
  dayNumber: number
  date: string
  title: string
  notes: string
  destination?: string
  defaultExpanded?: boolean
}

export function DayPanel({
  tripId,
  dayId,
  dayNumber,
  date,
  title,
  defaultExpanded = false,
  destination,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [editingTitle, setEditingTitle] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(title)
  const [titleDraft, setTitleDraft] = useState(title)
  const [titleError, setTitleError] = useState("")
  const updateTitle = useUpdateDayTitle(tripId)

  useEffect(() => {
    if (editingTitle) return
    setCurrentTitle(title)
    setTitleDraft(title)
  }, [editingTitle, title])

  const startTitleEdit = () => {
    setTitleDraft(currentTitle)
    setTitleError("")
    setEditingTitle(true)
  }

  const cancelTitleEdit = () => {
    setTitleDraft(currentTitle)
    setTitleError("")
    setEditingTitle(false)
  }

  const saveTitle = async () => {
    const normalized = titleDraft.trim()
    if (normalized.length > 80) {
      setTitleError("Day title must be 80 characters or less.")
      return
    }
    if (normalized === currentTitle) {
      setEditingTitle(false)
      return
    }

    setTitleError("")
    try {
      const updated = await updateTitle.mutateAsync({ dayId, title: normalized })
      setCurrentTitle(updated.title)
      setTitleDraft(updated.title)
      setEditingTitle(false)
    } catch {
      setTitleError("Could not save the day title. Please try again.")
    }
  }

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
      {/* Day header — expansion and title editing are separate actions. */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/10 sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`day-panel-${dayId}`}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora text-sm font-bold text-white shadow-sm">
            {dayNumber}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground">
              Day {dayNumber}
            </span>
            <span className="truncate text-xs text-muted-foreground">{dayLabel}</span>
          </span>
        </button>

        <div className="order-3 min-w-0 w-full pl-12 sm:order-none sm:flex-1 sm:pl-0">
          {editingTitle ? (
            <div>
              <div className="flex items-center gap-1.5">
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void saveTitle()
                    }
                    if (event.key === "Escape") cancelTitleEdit()
                  }}
                  maxLength={80}
                  autoFocus
                  disabled={updateTitle.isPending}
                  aria-label={`Title for Day ${dayNumber}`}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? `day-title-error-${dayId}` : undefined}
                  placeholder="Add a title for this day"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-primary/50 bg-background px-2.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void saveTitle()}
                  disabled={updateTitle.isPending}
                  aria-label="Save day title"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {updateTitle.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelTitleEdit}
                  disabled={updateTitle.isPending}
                  aria-label="Cancel editing day title"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {titleError && (
                <p id={`day-title-error-${dayId}`} className="mt-1 text-xs text-destructive" role="alert">
                  {titleError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={startTitleEdit}
              className={cn(
                "group/title flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                currentTitle
                  ? "font-medium text-foreground"
                  : "text-xs text-muted-foreground",
              )}
              aria-label={currentTitle ? `Edit day title: ${currentTitle}` : "Add day title"}
            >
              <span className="truncate">{currentTitle || "+ Add day title"}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover/title:opacity-100" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`day-panel-${dayId}`}
          aria-label={`${expanded ? "Collapse" : "Expand"} Day ${dayNumber}`}
          className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

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
              dayNumber={dayNumber}
              destination={destination}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
