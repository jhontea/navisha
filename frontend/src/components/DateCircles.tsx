"use client"

import { useRef, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export interface DateCircleDay {
  id: string
  /** "YYYY-MM-DD" */
  date: string
  /** Shows a dot under the date: the day already has plans. */
  hasItems?: boolean
}

function parts(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return { d, month: MONTHS[mo], weekday: WEEKDAYS[new Date(Date.UTC(y, mo, d)).getUTCDay()] }
}

/**
 * Horizontal day picker: one circle per trip day (docs/DESIGN.md §5).
 * A radiogroup: Tab enters the selected day, arrow keys move and select.
 */
export function DateCircles({
  days,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Day",
}: {
  days: DateCircleDay[]
  value: string | null
  onChange: (id: string) => void
  className?: string
  "aria-label"?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = Math.max(0, days.findIndex((d) => d.id === value))

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = Math.min(days.length - 1, Math.max(0, index + step))
    onChange(days[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none]", className)}
    >
      {days.map((day, index) => {
        const p = parts(day.date)
        const selected = index === selectedIndex
        return (
          <button
            key={day.id}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={p ? `Day ${index + 1}, ${p.weekday} ${p.d} ${p.month}${day.hasItems ? ", has plans" : ""}` : `Day ${index + 1}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(day.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative grid size-12 shrink-0 place-content-center rounded-full text-center leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border border-primary/30 bg-primary-soft text-primary-soft-foreground"
                : "border bg-card text-foreground hover:bg-primary-soft/60",
            )}
          >
            <span className="font-display text-lg font-extrabold">{p?.d ?? index + 1}</span>
            <span className={cn("mt-0.5 text-xs", selected ? "text-primary-soft-foreground" : "text-muted-foreground")}>
              {p?.month ?? ""}
            </span>
            {day.hasItems && (
              <span
                className={cn(
                  "absolute -bottom-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                  selected ? "bg-primary" : "bg-primary/40",
                )}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
