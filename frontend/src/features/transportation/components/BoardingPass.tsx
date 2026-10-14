import type { ReactNode } from "react"

import { daysBetween, formatClock, formatWeekdayDate } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { parsePlace, type PlaceLabel } from "../lib/place"
import { transportIcon, transportTypeLabel } from "../lib/transportType"
import type { Transportation } from "../types"

/**
 * A transport booking drawn as a boarding pass (docs/DESIGN.md §5): number and
 * operator, origin → destination, a notched tear line, then the facts.
 * Read-only; actions (edit, delete) live on the surrounding card.
 *
 * Times are wall-clock local times without a zone, so no duration is shown:
 * across time zones it would be wrong.
 */
export function BoardingPass({
  transportation: t,
  dayNumber,
  actions,
  className,
}: {
  transportation: Transportation
  /** Trip day of the departure, when known. */
  dayNumber?: number | null
  /** Optional slot top-right, e.g. the ⋯ menu. */
  actions?: ReactNode
  className?: string
}) {
  const Icon = transportIcon(t.type)
  const typeLabel = transportTypeLabel(t.type)
  const from = parsePlace(t.from_location)
  const to = parsePlace(t.to_location)
  const depart = formatClock(t.departure_datetime)
  const arrive = formatClock(t.arrival_datetime)
  const shift = daysBetween(t.departure_datetime, t.arrival_datetime)
  const date = formatWeekdayDate(t.departure_datetime)

  const facts: { label: string; value: ReactNode }[] = []
  if (depart) facts.push({ label: "Departs", value: depart })
  if (arrive)
    facts.push({
      label: "Arrives",
      value: (
        <>
          {arrive}
          {shift !== null && shift > 0 && (
            <span className="ml-0.5 align-top text-xs text-muted-foreground">
              +{shift}
              <span className="sr-only"> {shift === 1 ? "day" : "days"} later</span>
            </span>
          )}
        </>
      ),
    })
  if (date) facts.push({ label: "Date", value: date })
  if (dayNumber) facts.push({ label: "Trip day", value: `Day ${dayNumber}` })
  if (t.reference_number) facts.push({ label: "Booking ref", value: t.reference_number })

  const title = t.label || typeLabel

  return (
    <article
      aria-label={`${typeLabel}${t.label ? ` ${t.label}` : ""}${from ? ` from ${from.name}` : ""}${to ? ` to ${to.name}` : ""}`}
      className={cn("relative rounded-2xl border bg-card p-4 shadow-card", className)}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
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
            <Icon className="h-4 w-4 text-primary" />
            <span className="h-px flex-1 border-t-2 border-dotted border-current" />
          </div>
          <Endpoint place={to} align="end" />
        </div>
      )}

      {facts.length > 0 && (
        <div className="relative mt-4 border-t-2 border-dashed pt-3">
          {/* Notches of the tear line: the page background showing through. */}
          <span className="absolute -left-[1.6875rem] -top-2.5 size-5 rounded-full border bg-background" aria-hidden="true" />
          <span className="absolute -right-[1.6875rem] -top-2.5 size-5 rounded-full border bg-background" aria-hidden="true" />
          <dl className="grid grid-cols-3 gap-x-2 gap-y-2">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate text-sm font-bold text-foreground tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </article>
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
