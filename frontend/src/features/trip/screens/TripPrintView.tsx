"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Check, Printer, RefreshCw } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useTripActivities } from "@/features/activity/hooks/useActivities"
import { buildStaticItems, extractDate, interleaveTimeline, type TimelineEntry } from "@/features/activity/lib/timeline"
import { formatActivityTimeRange } from "@/features/activity/lib/time"
import type { Activity, LocationPayload, NotePayload, TodoPayload } from "@/features/activity/types"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import type { Accommodation } from "@/features/accommodation/types"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { transportTitle } from "@/features/transportation/lib/transportType"
import type { Transportation } from "@/features/transportation/types"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { formatTripRange } from "@/features/trip/lib/home"
import { ApiError } from "@/lib/api"
import { formatClock, formatShortRange, formatWeekdayDate, nightsBetween } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import type { Day } from "../types"

const BLOCK = "break-inside-avoid border-b py-2.5 last:border-b-0"

/** "Sun, 10 May 06:30" read from the wall-clock string, no timezone conversion. */
function dateTime(value: string | null): string | null {
  if (!value) return null
  return [formatWeekdayDate(value), formatClock(value)].filter(Boolean).join(" ")
}

function Detail({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]">{children}</p>
}

function Row({ time, title, children }: { time?: string | null; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="w-24 shrink-0 text-sm font-bold sm:w-32 tabular-nums text-foreground">{time}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground [overflow-wrap:anywhere]">{title}</p>
        {children}
      </div>
    </div>
  )
}

function ActivityEntry({ activity: a }: { activity: Activity }) {
  const time = formatActivityTimeRange(a.start_time?.slice(0, 5) || undefined, a.end_time?.slice(0, 5) || undefined)
  if (a.type === "todo") {
    const items = (a.payload as TodoPayload | null)?.items ?? []
    return (
      <Row time={time} title={a.title || "To-do"}>
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm text-foreground">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-none border-2 border-foreground"
              >
                {item.completed && <Check className="size-2.5" strokeWidth={4} />}
              </span>
              <span className={cn("[overflow-wrap:anywhere]", item.completed && "line-through")}>
                <span className="sr-only">{item.completed ? "Done: " : "Not done: "}</span>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </Row>
    )
  }
  if (a.type === "note") {
    const content = (a.payload as NotePayload | null)?.content
    return <Row time={time} title={a.title || "Note"}>{content && <Detail>{content}</Detail>}</Row>
  }
  const p = a.payload as LocationPayload | null
  const place = [p?.location_name, p?.address].filter((v) => v && v !== a.title).join(", ")
  return (
    <Row time={time} title={a.title}>
      {place && <Detail>{place}</Detail>}
      {p?.notes && <Detail>{p.notes}</Detail>}
      {p?.external_url && <Detail>{p.external_url}</Detail>}
    </Row>
  )
}

function Entry({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "activity") return <ActivityEntry activity={entry.activity} />
  if (entry.kind === "transport") {
    const t = entry.data
    // A same-day arrival joins the time range; a later one is spelled out with its date.
    const sameDay = extractDate(t.arrival_datetime) === extractDate(t.departure_datetime)
    const departs = formatClock(t.departure_datetime) ?? undefined
    const time = formatActivityTimeRange(departs, (sameDay && formatClock(t.arrival_datetime)) || undefined)
    return (
      <Row time={time} title={transportTitle(t)}>
        {!sameDay && t.arrival_datetime && <Detail>Arrives {dateTime(t.arrival_datetime)}</Detail>}
        {t.operator && <Detail>{t.operator}</Detail>}
        {t.reference_number && <Detail>Booking ref: {t.reference_number}</Detail>}
      </Row>
    )
  }
  const s = entry.data
  return (
    <Row time={entry.at} title={`${entry.event === "check_in" ? "Check-in" : "Check-out"}: ${s.name}`}>
      {s.location_name && <Detail>{s.location_name}</Detail>}
      {s.confirmation_number && <Detail>Confirmation: {s.confirmation_number}</Detail>}
    </Row>
  )
}

function PrintDay({ day, entries }: { day: Day; entries: TimelineEntry[] }) {
  const [first, ...rest] = entries
  const header = (
    <div className="pb-1">
      <h2 className="font-display text-lg font-extrabold text-foreground">
        Day {day.day_number} · {formatWeekdayDate(day.date)}
        {day.title && <span className="font-bold text-muted-foreground"> · {day.title}</span>}
      </h2>
      {day.notes && <Detail>{day.notes}</Detail>}
    </div>
  )
  return (
    <section className="mt-6 border-t-2 border-foreground pt-3">
      {/* The day header always shares a page with its first plan. */}
      <div className="break-inside-avoid">
        {header}
        {first ? (
          <div className={BLOCK}>
            <Entry entry={first} />
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">No plans</p>
        )}
      </div>
      {rest.map((entry) => (
        <div key={entry.kind === "activity" ? entry.activity.id : `${entry.kind}-${entry.data.id}-${"event" in entry ? entry.event : ""}`} className={BLOCK}>
          <Entry entry={entry} />
        </div>
      ))}
    </section>
  )
}

function Bookings({ transports, stays }: { transports: Transportation[]; stays: Accommodation[] }) {
  if (transports.length === 0 && stays.length === 0) return null
  const byDeparture = [...transports].sort((a, b) => (a.departure_datetime ?? "~").localeCompare(b.departure_datetime ?? "~"))
  const byCheckIn = [...stays].sort((a, b) => a.check_in.localeCompare(b.check_in))
  return (
    <section className="mt-8 border-t-2 border-foreground pt-3">
      <h2 className="font-display text-lg font-extrabold text-foreground">Bookings</h2>
      {byDeparture.map((t) => (
        <div key={t.id} className={BLOCK}>
          <p className="font-bold text-foreground [overflow-wrap:anywhere]">{transportTitle(t)}</p>
          {t.operator && <Detail>{t.operator}</Detail>}
          {t.departure_datetime && <Detail>Departs {dateTime(t.departure_datetime)}</Detail>}
          {t.arrival_datetime && <Detail>Arrives {dateTime(t.arrival_datetime)}</Detail>}
          {t.reference_number && <Detail>Booking ref: {t.reference_number}</Detail>}
          {t.notes && <Detail>{t.notes}</Detail>}
        </div>
      ))}
      {byCheckIn.map((s) => {
        const nights = nightsBetween(s.check_in, s.check_out)
        return (
          <div key={s.id} className={BLOCK}>
            <p className="font-bold text-foreground [overflow-wrap:anywhere]">{s.name}</p>
            {s.location_name && <Detail>{s.location_name}</Detail>}
            <Detail>
              {formatShortRange(s.check_in, s.check_out)}
              {nights !== null && ` · ${nights} ${nights === 1 ? "night" : "nights"}`}
              {s.check_in_time && ` · check-in ${s.check_in_time.slice(0, 5)}`}
              {s.check_out_time && ` · check-out ${s.check_out_time.slice(0, 5)}`}
            </Detail>
            {s.confirmation_number && <Detail>Confirmation: {s.confirmation_number}</Detail>}
            {s.notes && <Detail>{s.notes}</Detail>}
          </div>
        )
      })}
    </section>
  )
}

/**
 * Printable itinerary (opened in a new tab from "Download PDF"): the whole
 * trip on plain pages, in the same order as the itinerary, plus bookings with
 * their references. Opens the print dialog once, so "Save as PDF" is one step.
 */
export function TripPrintView() {
  const { id: tripId } = useParams<{ id: string }>()
  const trip = useTrip(tripId)
  const activities = useTripActivities(tripId)
  const transports = useTransportations(tripId)
  const stays = useAccommodations(tripId)
  const queries = [trip, activities, transports, stays]
  const ready = queries.every((q) => q.data)
  const failed = !ready && queries.some((q) => q.isError)
  const notFound = trip.error instanceof ApiError && (trip.error.status === 404 || trip.error.status === 403)
  const printed = useRef(false)

  useEffect(() => {
    if (!ready || printed.current) return
    printed.current = true
    // Wait for the web fonts so the first print preview isn't laid out in a fallback font.
    void document.fonts.ready.then(() => window.print())
  }, [ready])

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Link href={`/trips/${tripId}`} className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft aria-hidden="true" />
        Back to trip
      </Link>
      {ready && (
        <Button type="button" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print
        </Button>
      )}
    </div>
  )

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-margin-mobile py-10 md:px-margin-desktop">
        <div className="rounded-2xl border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 font-display text-xl font-extrabold text-foreground">
            {notFound ? "Trip not found" : "Couldn't load this trip"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {notFound
              ? "This trip may have been deleted or you no longer have access to it."
              : "Check your connection and try again."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {!notFound && (
              <Button type="button" onClick={() => queries.forEach((q) => q.isError && void q.refetch())}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
            )}
            <Link href={`/trips/${tripId}`} className={buttonVariants({ variant: "outline" })}>
              Back to trip
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!ready || !trip.data) {
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-margin-mobile py-10 md:px-margin-desktop" aria-label="Loading itinerary" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </main>
    )
  }

  const t = trip.data
  const byDay = activities.data?.items_by_day ?? {}
  const transportList = transports.data?.items ?? []
  const stayList = stays.data?.items ?? []
  const days = [...(t.days ?? [])].sort((a, b) => a.day_number - b.day_number)

  return (
    <main className="mx-auto max-w-3xl px-margin-mobile py-8 text-foreground md:px-margin-desktop [page:itinerary] print:max-w-none print:p-0">
      {toolbar}
      <header className="mt-6 print:mt-0">
        <h1 className="font-display text-3xl font-extrabold leading-tight text-balance">{t.title}</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground tabular-nums">
          {[formatTripRange(t.start_date, t.end_date), t.description].filter(Boolean).join(" · ")}
        </p>
        {t.notes && <Detail>{t.notes}</Detail>}
      </header>
      {days.map((day) => {
        const date = day.date.slice(0, 10)
        const entries = interleaveTimeline(byDay[day.id] ?? [], buildStaticItems(transportList, stayList, date))
        return <PrintDay key={day.id} day={day} entries={entries} />
      })}
      <Bookings transports={transportList} stays={stayList} />
    </main>
  )
}
