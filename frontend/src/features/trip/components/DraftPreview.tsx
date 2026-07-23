"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, MapPin } from "lucide-react"
import type { TripDraft } from "../types"
import { suggestionKey } from "../lib/suggestionKey"
import { cn } from "@/lib/utils"

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
      <div className="glass-lg rounded-xl p-6">
        <h3 className="font-headline-md text-headline-md text-foreground mb-1">
          {draft.title}
        </h3>
        {draft.summary && (
          <p className="font-body-md text-foreground-variant mb-4">{draft.summary}</p>
        )}
        <div className="flex flex-wrap gap-4 text-body-sm text-foreground-variant">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_month</span>
            {draft.days.length} hari
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>list</span>
            {totalActivities} aktivitas
          </span>
          {draft.budget > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
              {draft.budget.toLocaleString()} {draft.base_currency}
            </span>
          )}
        </div>
      </div>

      {/* Curation toolbar */}
      {totalActivities > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5">
          <span className="text-body-sm text-foreground-variant">
            <span className="font-semibold text-foreground">{selectedCount}</span>
            {" "}/ {totalActivities} tempat dipilih
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-full px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {selectedCount === totalActivities ? "Kosongkan semua" : "Pilih semua"}
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
            className="rounded-xl border border-border bg-white p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
                {day.day_number}
              </span>
              <span className="font-label-md text-label-md text-foreground">
                Hari {day.day_number}
              </span>
              <span className="text-body-sm text-foreground-variant">{day.date}</span>
              {dayKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleDay(dayKeys, dayAllSelected)}
                  className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {dayAllSelected ? "Kosongkan" : "Pilih semua"}
                </button>
              )}
            </div>

            {day.activities.length === 0 ? (
              <p className="pl-10 text-body-sm text-foreground-variant italic">
                Belum ada aktivitas
              </p>
            ) : (
              <ul className="space-y-2 pl-10">
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
                          "flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          selected
                            ? "border-primary/35 bg-primary/5 shadow-sm shadow-primary/5"
                            : "border-border/40 bg-background opacity-65 hover:opacity-100",
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
                          <span
                            className="material-symbols-outlined mt-0.5 text-outline"
                            style={{ fontSize: 18 }}
                            aria-hidden="true"
                          >
                            sticky_note_2
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block font-body-md text-foreground">
                            {a.title}
                            {(a.start_time || a.end_time) && (
                              <span className="ml-2 text-body-sm text-foreground-variant">
                                {a.start_time}
                                {a.end_time ? `–${a.end_time}` : ""}
                              </span>
                            )}
                          </span>
                          {a.type === "location" && a.location_name && (
                            <span className="block text-body-sm text-foreground-variant">{a.location_name}</span>
                          )}
                          {a.notes && (
                            <span className="mt-0.5 block text-body-sm text-foreground-variant">{a.notes}</span>
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
