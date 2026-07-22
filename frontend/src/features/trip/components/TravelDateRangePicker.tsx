"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

interface DateRangeValue {
  startDate: string
  endDate: string
}

interface Props extends DateRangeValue {
  onChange: (value: DateRangeValue, complete: boolean) => void
  duration?: number | null
  hasError?: boolean
  errorId?: string
  disabled?: boolean
  label?: string
  emptyText?: string
  endText?: string
  startHint?: string
  endHint?: string
  durationUnit?: string
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function TravelDateRangePicker({
  startDate,
  endDate,
  onChange,
  duration,
  hasError = false,
  errorId,
  disabled = false,
  label = "Travel dates",
  emptyText = "Select start and end dates",
  endText = "Select end date",
  startHint = "Choose the first day of your trip",
  endHint = "Choose the last day of your trip",
  durationUnit = "day",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseISODate(startDate) ?? new Date()),
  )

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && startDate) {
      const selectedStart = parseISODate(startDate)
      if (selectedStart) setVisibleMonth(startOfMonth(selectedStart))
    }
  }, [isOpen, startDate])

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  )
  const selectingEnd = Boolean(startDate && !endDate)
  const displayedDuration =
    duration === undefined
      ? getInclusiveDayCount(startDate, endDate)
      : duration

  const selectDate = (date: Date) => {
    const value = toISODate(date)

    if (!selectingEnd) {
      onChange({ startDate: value, endDate: "" }, false)
      return
    }

    if (value < startDate) {
      onChange({ startDate: value, endDate: "" }, false)
      return
    }

    onChange({ startDate, endDate: value }, true)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className={`flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-all hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          hasError ? "border-destructive" : "border-border"
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={errorId}
      >
        <CalendarDays
          className="h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={`block truncate text-sm ${
              startDate ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {formatDateRange(startDate, endDate, emptyText, endText)}
          </span>
        </span>
        {displayedDuration !== null && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {displayedDuration}{" "}
            {displayedDuration === 1 ? durationUnit : `${durationUnit}s`}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[296px] max-w-sm rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold">
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday}
                className="py-1 text-[11px] font-medium text-muted-foreground"
              >
                {weekday}
              </span>
            ))}
            {calendarDays.map((date) => {
              const value = toISODate(date)
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
              const isStart = value === startDate
              const isEnd = value === endDate
              const isInRange = Boolean(
                startDate && endDate && value > startDate && value < endDate,
              )
              const isToday = value === toISODate(new Date())

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`relative flex h-9 items-center justify-center text-sm transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isStart || isEnd
                      ? "rounded-lg bg-primary font-semibold text-primary-foreground"
                      : `${
                          isInRange
                            ? "bg-primary/10"
                            : "rounded-lg hover:bg-accent"
                        } ${
                          isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                        }`
                  }`}
                  aria-label={date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  aria-pressed={isStart || isEnd}
                >
                  {date.getDate()}
                  {isToday && !isStart && !isEnd && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          <p className="mt-3 border-t border-border pt-2 text-center text-xs text-muted-foreground">
            {selectingEnd
              ? endHint
              : startHint}
          </p>
        </div>
      )}
    </div>
  )
}

function parseISODate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month)
  const gridStart = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - firstDay.getDay(),
  )

  return Array.from({ length: 42 }, (_, index) =>
    new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    ),
  )
}

function formatDateRange(
  startDate: string,
  endDate: string,
  emptyText: string,
  endText: string,
) {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  if (!start) return emptyText
  if (!end) {
    return `${formatDate(start, true)} — ${endText}`
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${formatDate(start, false)} — ${formatDate(end, true)}`
  }

  return `${formatDate(start, true)} — ${formatDate(end, true)}`
}

export function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  if (!start || !end || end < start) return null

  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  )
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUTC - startUTC) / 86_400_000) + 1
}

function formatDate(date: Date, includeYear: boolean) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  })
}
