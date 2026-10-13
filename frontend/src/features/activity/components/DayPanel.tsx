"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Check, CheckSquare, ChevronDown, LoaderCircle, MoreHorizontal, Pencil, X } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useUpdateDayTitle } from "@/features/trip/hooks/useTrips"
import type { Day } from "@/features/trip/types"
import { useItineraryFocus } from "../ItineraryFocus"

const DayActivities = dynamic(
  () => import("./DayActivities").then((module) => module.DayActivities),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3" aria-label="Loading day activities">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-11 animate-pulse rounded-xl bg-muted/70" />
      </div>
    ),
  },
)

interface Props {
  tripId: string
  dayId: string
  dayNumber: number
  date: string
  title: string
  notes: string
  destination?: string
  defaultExpanded?: boolean
  days: Day[]
}

const MENU_ITEM = "min-h-10 px-3 text-sm"

/** A collapsible day: header (number, date, title, ⋯ menu) and its timeline. */
export function DayPanel({
  tripId,
  dayId,
  dayNumber,
  date,
  title,
  defaultExpanded = false,
  destination,
  days,
}: Props) {
  const { activeDayId, setActiveDayId } = useItineraryFocus()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [hasBeenExpanded, setHasBeenExpanded] = useState(defaultExpanded)
  const [selectMode, setSelectMode] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(title)
  const [titleDraft, setTitleDraft] = useState(title)
  const [titleError, setTitleError] = useState("")
  const updateTitle = useUpdateDayTitle(tripId)

  const expand = () => {
    setExpanded(true)
    setHasBeenExpanded(true)
    setActiveDayId(dayId)
  }

  const toggleExpanded = () => {
    if (expanded) {
      setExpanded(false)
      setSelectMode(false)
    } else {
      expand()
    }
  }

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
      setTitleError("Couldn't save the day title. Try again.")
    }
  }

  // "Sun, 10 May"
  const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  const isActive = activeDayId === dayId

  return (
    <section
      id={`day-${dayId}`}
      aria-labelledby={`day-heading-${dayId}`}
      className={cn("rounded-xl border bg-card", isActive && expanded && "border-primary/40")}
    >
      <div className="flex items-start gap-2 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-controls={`day-panel-${dayId}`}
          className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span id={`day-heading-${dayId}`} className="text-base font-semibold text-foreground">
            Day {dayNumber}
            <span className="font-normal text-muted-foreground"> · {dayLabel}</span>
          </span>
          {!editingTitle && currentTitle && (
            <span className="truncate text-sm text-muted-foreground">{currentTitle}</span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Day ${dayNumber} actions`}
            className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0 text-muted-foreground" })}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className={MENU_ITEM} onClick={startTitleEdit}>
              <Pencil aria-hidden="true" />
              {currentTitle ? "Edit day title" : "Add day title"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={MENU_ITEM}
              onClick={() => {
                expand()
                setSelectMode(true)
              }}
            >
              <CheckSquare aria-hidden="true" />
              Select & copy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-controls={`day-panel-${dayId}`}
          aria-label={`${expanded ? "Collapse" : "Expand"} Day ${dayNumber}`}
          className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0 text-muted-foreground" })}
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {editingTitle && (
        <div className="px-3 pb-3 sm:px-4">
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
              placeholder="e.g. Arrival & Shibuya nights"
              className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void saveTitle()}
              disabled={updateTitle.isPending}
              aria-label="Save day title"
              className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0 text-primary" })}
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
              className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0 text-muted-foreground" })}
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
      )}

      {/* Grid-rows animation: grid-rows-[0fr] -> [1fr] gives a smooth height transition. */}
      <div
        id={`day-panel-${dayId}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t px-2 pb-3 pt-3 sm:px-4">
            {hasBeenExpanded ? (
              <DayActivities
                tripId={tripId}
                dayId={dayId}
                date={date}
                dayNumber={dayNumber}
                destination={destination}
                days={days}
                selectMode={selectMode}
                onSelectModeChange={setSelectMode}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
