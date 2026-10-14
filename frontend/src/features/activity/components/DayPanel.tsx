"use client"

import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Check, CheckSquare, LoaderCircle, MoreHorizontal, Pencil, X } from "lucide-react"

import { buttonVariants, Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUpdateDayTitle } from "@/features/trip/hooks/useTrips"
import type { Day } from "@/features/trip/types"

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
  days: Day[]
}

const MENU_ITEM = "min-h-10 px-3 text-sm"

/**
 * The selected day (V4, one day at a time): two-tone header with the date and
 * the day title, a ⋯ menu, and the day's timeline.
 */
export function DayPanel({
  tripId,
  dayId,
  dayNumber,
  date,
  title,
  destination,
  days,
}: Props) {
  const [selectMode, setSelectMode] = useState(false)
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
      setTitleError("Couldn't save the day title. Try again.")
    }
  }

  // "Sun, 10 May"
  const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  return (
    <section id={`day-${dayId}`} aria-labelledby={`day-heading-${dayId}`} className="rounded-2xl border bg-card shadow-card">
      <div className="flex items-start gap-2 px-4 pb-1 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id={`day-heading-${dayId}`} className="font-display text-xl font-extrabold leading-tight text-foreground">
            Day {dayNumber}
            <span className="text-muted-foreground"> · {dayLabel}</span>
          </h2>
          {!editingTitle && currentTitle && (
            <p className="mt-0.5 truncate text-sm font-semibold text-muted-foreground">{currentTitle}</p>
          )}
        </div>

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
            <DropdownMenuItem className={MENU_ITEM} onClick={() => setSelectMode(true)}>
              <CheckSquare aria-hidden="true" />
              Select & copy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {editingTitle && (
        <div className="px-4 pb-3 sm:px-5">
          <div className="flex items-center gap-1.5">
            <Input
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
              className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            />
            <Button
              type="button"
              onClick={() => void saveTitle()}
              disabled={updateTitle.isPending}
              aria-label="Save day title"
              variant="ghost" size="icon" className="shrink-0 text-primary"
            >
              {updateTitle.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              type="button"
              onClick={cancelTitleEdit}
              disabled={updateTitle.isPending}
              aria-label="Cancel editing day title"
              variant="ghost" size="icon" className="shrink-0 text-muted-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {titleError && (
            <p id={`day-title-error-${dayId}`} className="mt-1 text-xs text-destructive" role="alert">
              {titleError}
            </p>
          )}
        </div>
      )}

      <div className="px-2 pb-4 pt-3 sm:px-5">
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
      </div>
    </section>
  )
}
