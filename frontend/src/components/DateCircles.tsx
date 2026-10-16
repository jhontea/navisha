"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export interface DateCircleDay {
  id: string
  /** "YYYY-MM-DD" */
  date: string
  /** Read out to screen readers ("has plans"); not drawn. */
  hasItems?: boolean
}

function parts(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo, d)).getUTCDay()]
  return { d, month: MONTHS[mo], weekday, short: weekday.slice(0, 3) }
}

/**
 * Day picker: one circle per trip day with the weekday and the date
 * (docs/DESIGN.md §5). The selected day is solid blue.
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

  // Keep the selected day in view when it changes (e.g. today on a long trip).
  useEffect(() => {
    refs.current[selectedIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [selectedIndex])

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
      className={cn("-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]", className)}
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
              "flex size-[3.75rem] shrink-0 flex-col items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-card"
                : "bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft/50",
            )}
          >
            <span
              className={cn(
                "text-xs font-bold uppercase leading-none tracking-wide",
                selected ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {p?.short ?? ""}
            </span>
            <span className="mt-0.5 font-display text-xl font-extrabold leading-none tabular-nums">{p?.d ?? index + 1}</span>
          </button>
        )
      })}
    </div>
  )
}
