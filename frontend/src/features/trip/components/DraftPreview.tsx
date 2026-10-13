"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, CalendarDays, Check, List, MapPin, StickyNote } from "lucide-react"
import type { TripDraft } from "../types"
import { suggestionKey } from "../lib/suggestionKey"
import { buttonVariants } from "@/components/ui/button"
import { formatWeekdayDate } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/money"

interface Props {
  draft: TripDraft
  // Called whenever the selection changes. Receives the set of selected
  // suggestion keys. When omitted, DraftPreview is purely presentational
  // (all activities shown, no toggling).
  onSelectionChange?: (selectedKeys: Set<string>) => void
}

// DraftPreview renders a generated itinerary as an interactive curation
// surface. Each suggested place is a toggleable chip — the user trims the
// AI output before committing the trip. Default: all selected (preserves
// prior all-or-nothing behavior). Kept presentational; no data fetching here.
export function DraftPreview({ draft, onSelectionChange }: Props) {
  const totalActivities = draft.days.reduce((n, d) => n + d.activities.length, 0)

  // Build the full key set once per draft. useMemo so identity is stable
  // across re-renders (avoids resetting selection on parent re-render).
  const allKeys = useMemo(
    () => new Set(draft.days.flatMap((d) => d.activities.map(suggestionKey))),
    [draft],
  )

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(allKeys))

  // Keep selection in sync when a fresh draft arrives (e.g. regenerate).
  useEffect(() => {
    setSelectedKeys(new Set(allKeys))
  }, [allKeys])

  // Notify parent whenever selection changes.
  useEffect(() => {
    onSelectionChange?.(selectedKeys)
  }, [selectedKeys, onSelectionChange])

  const toggle = useCallback((key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleDay = useCallback((dayKeys: string[], allSelected: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (allSelected) {
        for (const k of dayKeys) next.delete(k)
      } else {
        for (const k of dayKeys) next.add(k)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedKeys((current) =>
      current.size === allKeys.size ? new Set() : new Set(allKeys),
    )
  }, [allKeys])

  const selectedCount = selectedKeys.size

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="rounded-xl border bg-card p-5 md:p-6">
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          {draft.title}
        </h2>
        {draft.summary && (
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{draft.summary}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {draft.days.length} {draft.days.length === 1 ? "day" : "days"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <List className="h-4 w-4" aria-hidden="true" />
            {totalActivities} {totalActivities === 1 ? "activity" : "activities"}
          </span>
          {draft.budget > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="h-4 w-4" aria-hidden="true" />
              {formatMoney(draft.budget, draft.base_currency)}
            </span>
          )}
        </div>
      </div>

      {/* Curation toolbar */}
      {totalActivities > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-1.5 shadow-card">
          <span className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{selectedCount}</span>
            {" "}of {totalActivities} places selected
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "text-primary" })}
          >
            {selectedCount === totalActivities ? "Clear all" : "Select all"}
          </button>
        </div>
      )}

      {/* Days */}
      <div className="space-y-4">
        {draft.days.map((day) => {
          const dayKeys = day.activities.map(suggestionKey)
          const daySelected = dayKeys.filter((k) => selectedKeys.has(k)).length
          const dayAllSelected = dayKeys.length > 0 && daySelected === dayKeys.length
          return (
          <div
            key={day.day_number}
            className="rounded-xl border bg-card p-4 md:p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">
                Day {day.day_number}
                <span className="font-normal text-muted-foreground"> · {formatWeekdayDate(day.date) ?? day.date}</span>
              </span>
              {dayKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDay(dayKeys, dayAllSelected)}
                  className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto text-primary" })}
                >
                  {dayAllSelected ? "Clear" : "Select all"}
                </button>
              )}
            </div>

            {day.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activities for this day
              </p>
            ) : (
              <ul className="space-y-2">
                {day.activities.map((a, i) => {
                  const key = suggestionKey(a)
                  const selected = selectedKeys.has(key)
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggle(key)}
                        className={cn(
                          "flex min-h-11 w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary/40 bg-primary/5"
                            : "bg-background text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-transparent",
                          )}
                          aria-hidden="true"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {a.type === "location" ? (
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {a.title}
                            {(a.start_time || a.end_time) && (
                              <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                                {a.start_time}
                                {a.end_time ? `–${a.end_time}` : ""}
                              </span>
                            )}
                          </span>
                          {a.type === "location" && a.location_name && (
                            <span className="block text-sm text-muted-foreground">{a.location_name}</span>
                          )}
                          {a.notes && (
                            <span className="mt-0.5 block text-sm text-muted-foreground">{a.notes}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
