"use client"

import { SelectableRow } from "@/components/SelectableRow"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, BedDouble, Bus, CalendarDays, Car, List, MapPin, Plane, StickyNote, TrainFront } from "lucide-react"
import type { TripDraft } from "../types"
import { suggestionKey } from "../lib/suggestionKey"
import { budgetRows, draftKeys, legKey, nights, stayKey } from "../lib/draftBookings"
import { Button } from "@/components/ui/button"
import { formatWeekdayDate } from "@/lib/calendar"
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
  const allKeys = useMemo(() => new Set(draftKeys(draft)), [draft])
  const legs = draft.transport_legs ?? []
  const stays = draft.lodging ?? []
  const budget = budgetRows(draft.budget_breakdown)

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
  const totalItems = allKeys.size

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="rounded-2xl border bg-card shadow-card p-5 md:p-6">
        <h2 className="mb-1 text-xl font-display font-extrabold text-foreground">
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
        {budget.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-4 text-sm sm:grid-cols-3">
            {budget.map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-foreground tabular-nums">{formatMoney(row.amount, draft.base_currency)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Curation toolbar */}
      {totalItems > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card shadow-card px-4 py-1.5 shadow-card">
          <span className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{selectedCount}</span>
            {" "}of {totalItems} selected
          </span>
          <Button
            type="button"
            onClick={toggleAll}
            variant="ghost" size="sm" className="text-primary"
          >
            {selectedCount === totalItems ? "Clear all" : "Select all"}
          </Button>
        </div>
      )}

      {/* Bookings: saved as transport and stay records, not activities */}
      {(legs.length > 0 || stays.length > 0) && (
        <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card md:p-5">
          {legs.length > 0 && (
            <section aria-labelledby="draft-legs" className="space-y-2">
              <h3 id="draft-legs" className="text-base font-semibold text-foreground">Getting there</h3>
              <ul className="space-y-2">
                {legs.map((leg, i) => {
                  const Icon = LEG_ICONS[leg.mode] ?? Car
                  return (
                    <li key={i}>
                      <SelectableRow selected={selectedKeys.has(legKey(i))} onToggle={() => toggle(legKey(i))}>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">{leg.label}</span>
                          <span className="block text-sm text-muted-foreground tabular-nums">
                            {formatWeekdayDate(leg.departure_date) ?? leg.departure_date} · {leg.departure_time}–
                            {leg.arrival_date !== leg.departure_date ? `${formatWeekdayDate(leg.arrival_date) ?? leg.arrival_date} ` : ""}
                            {leg.arrival_time}
                            {leg.estimated_cost > 0 && ` · ~${formatMoney(leg.estimated_cost, draft.base_currency)}`}
                          </span>
                          {leg.notes && <span className="mt-0.5 block text-sm text-muted-foreground">{leg.notes}</span>}
                        </span>
                      </SelectableRow>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {stays.length > 0 && (
            <section aria-labelledby="draft-stays" className="space-y-2">
              <h3 id="draft-stays" className="text-base font-semibold text-foreground">Stay</h3>
              <ul className="space-y-2">
                {stays.map((st, i) => {
                  const n = nights(st.check_in_date, st.check_out_date)
                  return (
                    <li key={i}>
                      <SelectableRow selected={selectedKeys.has(stayKey(i))} onToggle={() => toggle(stayKey(i))}>
                        <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">{st.name}</span>
                          <span className="block text-sm text-muted-foreground tabular-nums">
                            {formatWeekdayDate(st.check_in_date) ?? st.check_in_date}
                            {st.check_in_time && ` ${st.check_in_time}`} → {formatWeekdayDate(st.check_out_date) ?? st.check_out_date}
                            {st.check_out_time && ` ${st.check_out_time}`} · {n} {n === 1 ? "night" : "nights"}
                            {st.estimated_cost_per_night > 0 &&
                              ` · ~${formatMoney(st.estimated_cost_per_night, draft.base_currency)}/night`}
                          </span>
                          {st.notes && <span className="mt-0.5 block text-sm text-muted-foreground">{st.notes}</span>}
                        </span>
                      </SelectableRow>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
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
            className="rounded-2xl border bg-card shadow-card p-4 md:p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">
                Day {day.day_number}
                <span className="font-normal text-muted-foreground"> · {formatWeekdayDate(day.date) ?? day.date}</span>
              </span>
              {dayKeys.length > 0 && (
                <Button
                  type="button"
                  onClick={() => toggleDay(dayKeys, dayAllSelected)}
                  variant="ghost" size="sm" className="ml-auto text-primary"
                >
                  {dayAllSelected ? "Clear" : "Select all"}
                </Button>
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
                      <SelectableRow selected={selected} onToggle={() => toggle(key)}>
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
                      </SelectableRow>
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

const LEG_ICONS: Record<string, typeof Car> = { car: Car, bus: Bus, train: TrainFront, flight: Plane }
