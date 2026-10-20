import type { ReactNode } from "react"

import { daysBetween, formatClock, formatWeekdayDate } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { parsePlace, type PlaceLabel } from "../lib/place"
import { transportTypeLabel } from "../lib/transportType"
import type { Transportation } from "../types"
import { TransportIcon } from "./TransportIcon"

/**
 * A transport booking drawn as a boarding pass (docs/DESIGN.md §5): number and
 * operator, origin → destination, a notched tear line, then the facts.
 * Read-only; actions (edit, delete) live on the surrounding card.
 *
 * Times are wall-clock local times without a zone, so no duration is shown:
 * across time zones it would be wrong.
 */
/** The fields the pass reads; the timeline passes a trimmed transport. */
export type BoardingPassData = Pick<
  Transportation,
  "label" | "operator" | "from_location" | "to_location" | "departure_datetime" | "arrival_datetime"
> & { type: string; reference_number?: string }

export function BoardingPass({
  transportation: t,
  dayNumber,
  cost,
  showDate = true,
  actions,
  children,
  className,
}: {
  transportation: BoardingPassData
  /** Hide the date fact when the context already shows the day (itinerary timeline). */
  showDate?: boolean
  /** Trip day of the departure, when known. */
  dayNumber?: number | null
  /** Formatted cost of the linked expense, when the booking has one. */
  cost?: string | null
  /** Optional slot top-right, e.g. the ⋯ menu. */
  actions?: ReactNode
  /** Extra content under the facts, e.g. notes. */
  children?: ReactNode
  className?: string
}) {
  const typeLabel = transportTypeLabel(t.type)
  const from = parsePlace(t.from_location)
  const to = parsePlace(t.to_location)
  const depart = formatClock(t.departure_datetime)
  const arrive = formatClock(t.arrival_datetime)
  const shift = daysBetween(t.departure_datetime, t.arrival_datetime)
  const date = formatWeekdayDate(t.departure_datetime)

  const arriveValue = arrive && (
    <>
      {arrive}
      {shift !== null && shift > 0 && (
        <span className="ml-0.5 align-top text-xs text-muted-foreground">
          +{shift}
          <span className="sr-only"> {shift === 1 ? "day" : "days"} later</span>
        </span>
      )}
    </>
  )

  // Times sit under their endpoint; the rest of the facts go below the tear line.
  const facts: { label: string; value: ReactNode }[] = []
  if (date && showDate) facts.push({ label: "Date", value: date })
  if (dayNumber) facts.push({ label: "Trip day", value: `Day ${dayNumber}` })
  if (t.reference_number) facts.push({ label: "Booking ref", value: t.reference_number })
  if (cost) facts.push({ label: "Cost", value: cost })

  const title = t.label || typeLabel

  return (
    <article
      aria-label={`${typeLabel}${t.label ? ` ${t.label}` : ""}${from ? ` from ${from.name}` : ""}${to ? ` to ${to.name}` : ""}`}
      className={cn("relative rounded-2xl border bg-card p-4 shadow-card", className)}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <TransportIcon type={t.type} className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-foreground">{title}</p>
        {t.operator && (
          <span className="max-w-[45%] truncate rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-soft-foreground">
            {t.operator}
          </span>
        )}
        {actions}
      </header>

      {(from || to) && (
        <div className="mt-3 flex items-center gap-3">
          <Endpoint place={from} />
          <div className="flex min-w-10 flex-1 items-center gap-1 text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 border-t-2 border-dotted border-current" />
            <TransportIcon type={t.type} className="h-4 w-4 text-primary" />
            <span className="h-px flex-1 border-t-2 border-dotted border-current" />
          </div>
          <Endpoint place={to} align="end" />
        </div>
      )}
      {/* Own row under the places so both names stay level when only one time is known. */}
      {(depart || arrive) && (
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
          <TimeFact label="Departs" value={depart} />
          <TimeFact label="Arrives" value={arriveValue} align="end" />
        </div>
      )}

      {facts.length > 0 && (
        <div className="relative mt-4 border-t-2 border-dashed pt-3">
          {/* Notches of the tear line: the page background showing through. */}
          <span className="absolute -left-6.75 -top-2.5 size-5 rounded-full border bg-background" aria-hidden="true" />
          <span className="absolute -right-6.75 -top-2.5 size-5 rounded-full border bg-background" aria-hidden="true" />
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate text-sm font-bold text-foreground tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {children}
    </article>
  )
}

function TimeFact({ label, value, align = "start" }: { label: string; value: ReactNode; align?: "start" | "end" }) {
  if (!value) return <span aria-hidden="true" />
  return (
    <p className={cn("min-w-0", align === "end" && "text-right")}>
      <span className="text-xs text-muted-foreground">{label}</span>{" "}
      <span className="font-bold text-foreground tabular-nums">{value}</span>
    </p>
  )
}

function Endpoint({ place, align = "start" }: { place: PlaceLabel | null; align?: "start" | "end" }) {
  if (!place) return <p className={cn("shrink-0 text-sm text-muted-foreground", align === "end" && "text-right")}>—</p>
  return (
    <div className={cn("min-w-0 max-w-[42%] shrink-0", align === "end" && "text-right")}>
      {place.code ? (
        <>
          <p className="font-display text-3xl font-black leading-none tracking-tight text-foreground">{place.code}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={place.name}>
            {place.detail ?? place.name}
          </p>
        </>
      ) : (
        <>
          <p className="line-clamp-2 font-display text-base font-extrabold leading-tight text-foreground">{place.name}</p>
          {place.detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{place.detail}</p>}
        </>
      )}
    </div>
  )
}
