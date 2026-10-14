"use client"

import { Chip } from "@/components/Chip"
import { SegmentedControl } from "@/components/SegmentedControl"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Compass, List, Map as MapIcon, MapPin } from "lucide-react"

import { DateCircles } from "@/components/DateCircles"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ItineraryFocusProvider, useItineraryFocus } from "@/features/activity/ItineraryFocus"
import { colorForDay } from "@/features/map/components/mapColors"
import { formatTripRange, tripTimingLabel } from "../../lib/home"
import { getTripDateMetrics } from "../../lib/status"
import { resolveTripCover } from "../../lib/cover"
import { hasValidCoords } from "../../lib/mapsUrl"
import { defaultOpenDayId } from "../../lib/sharedTrip"
import { splitTripTitle } from "../../lib/title"
import type { PublicItinerary } from "../../types"
import { SharedDay } from "./SharedDay"

const SharedTripMap = dynamic(() => import("../SharedTripMap").then((m) => m.SharedTripMap), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted" aria-hidden="true" />,
})

const EXPIRY_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** Read-only shared trip: hero, day timelines, and a map (side by side on desktop). */
export function SharedTripView({ trip }: { trip: PublicItinerary }) {
  return (
    <ItineraryFocusProvider initialDayId={trip.days[0]?.id ?? null}>
      <div className="min-h-screen bg-background pb-12">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-max-width items-center justify-between gap-3 px-margin-mobile md:px-margin-desktop">
            <Link href="/" className="flex min-h-11 items-center gap-2 rounded-full" aria-label="Navisha home">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <Compass className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-black tracking-tight text-foreground">Navisha</span>
              <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">· Shared trip</span>
            </Link>
            <Link href="/" className={buttonVariants({ variant: "soft", size: "sm" })}>
              Plan your own trip
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-max-width px-margin-mobile md:px-margin-desktop">
          <Hero trip={trip} />
          <Body trip={trip} />
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Read-only copy shared from Navisha · Link expires {EXPIRY_FORMAT.format(new Date(trip.expires_at))}
          </p>
        </main>
      </div>
    </ItineraryFocusProvider>
  )
}

function Hero({ trip }: { trip: PublicItinerary }) {
  const cover = resolveTripCover(trip.cover_image_url, trip.description, 1600)
  const metrics = getTripDateMetrics(trip.start_date, trip.end_date)
  const nights = Math.max(0, metrics.totalDays - 1)
  const { main, rest } = splitTripTitle(trip.title)
  const meta = `${formatTripRange(trip.start_date, trip.end_date)} · ${nights} ${nights === 1 ? "night" : "nights"}`

  // Same cover hero as the app (DESIGN.md §5 TripCover); no cover → dusk navy.
  return (
    <section className="bg-cover-fallback relative mt-2 overflow-hidden rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[75%_50%]" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" aria-hidden="true" />
      <div className="relative flex min-h-56 flex-col justify-end gap-2 p-5 text-on-cover md:min-h-64 md:p-8">
        <span className="self-start rounded-full bg-cover-button/90 px-3 py-1 text-xs font-extrabold text-cover-button-foreground">
          {tripTimingLabel(metrics)}
        </span>
        <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight [text-wrap:balance] md:text-hero">
          {main}
          {rest && <span className="opacity-70"> {rest}</span>}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-on-cover/85 tabular-nums">
          <span>{meta}</span>
          {trip.description && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {trip.description}
            </span>
          )}
        </p>
      </div>
    </section>
  )
}

function Body({ trip }: { trip: PublicItinerary }) {
  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  // Day shown on the phone map; null = every day.
  const [mobileMapDay, setMobileMapDay] = useState<string | null>(null)
  const { activeDayId, setActiveDayId, selectedActivityId, selectActivity } = useItineraryFocus()
  const transportations = trip.transportations ?? []
  const accommodations = trip.accommodations ?? []
  // One day at a time, like the app: Day 1 when rendered, then today's day
  // once the browser knows the date (the server may be in another time zone).
  const activeDay = trip.days.find((d) => d.id === activeDayId) ?? trip.days[0]
  const dayHasPlaces = (d: PublicItinerary["days"][number]) => d.activities.some((a) => hasValidCoords(a.payload.lat, a.payload.lng))
  const hasPlaces = trip.days.some(dayHasPlaces)

  useEffect(() => {
    const id = defaultOpenDayId(trip.days)
    if (id && id !== trip.days[0]?.id) setActiveDayId(id)
  }, [trip.days, setActiveDayId])

  // A marker click on desktop brings its card into view.
  useEffect(() => {
    if (selectedActivityId) {
      document.getElementById(`activity-${selectedActivityId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedActivityId])

  if (trip.days.length === 0) {
    return <p className="mt-6 rounded-2xl border-2 border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">This trip has no days yet.</p>
  }

  return (
    <div className="mt-6">
      {hasPlaces && (
        <SegmentedControl
          aria-label="View"
          className="mb-4 lg:hidden"
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: "list", label: "Itinerary", icon: List },
            { value: "map", label: "Map", icon: MapIcon },
          ]}
        />
      )}

      {mobileView === "map" && (
        <div className="flex flex-col gap-3 lg:hidden">
          <div role="group" aria-label="Show day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <Chip pressed={mobileMapDay === null} onClick={() => setMobileMapDay(null)}>
              All days
            </Chip>
            {trip.days.filter(dayHasPlaces).map((d) => {
              const pressed = mobileMapDay === d.id
              return (
                <Chip key={d.id} pressed={pressed} onClick={() => setMobileMapDay(pressed ? null : d.id)}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForDay(d.day_number) }} aria-hidden="true" />
                  Day {d.day_number}
                </Chip>
              )
            })}
          </div>
          <div className="h-[65vh] overflow-hidden rounded-2xl border shadow-card">
            <SharedTripMap days={trip.days} dayId={mobileMapDay} />
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,37.5rem)_minmax(0,1fr)]",
          mobileView === "map" && "max-lg:hidden",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <DateCircles
            aria-label="Trip day"
            days={trip.days.map((d) => ({ id: d.id, date: d.date, hasItems: d.activities.length > 0 }))}
            value={activeDay.id}
            onChange={(id) => {
              selectActivity(null)
              setActiveDayId(id)
            }}
          />
          <SharedDay key={activeDay.id} day={activeDay} transportations={transportations} accommodations={accommodations} />
        </div>

        {hasPlaces && (
          <aside
            aria-label="Map of the selected day"
            className="sticky top-20 hidden h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-card lg:flex"
          >
            <p className="border-b px-5 py-3 font-display text-base font-extrabold text-foreground">
              {activeDay ? `Day ${activeDay.day_number} map` : "Map"}
            </p>
            <div className="relative min-h-0 flex-1">
              {activeDay && !dayHasPlaces(activeDay) ? (
                <p className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  No places with a location on Day {activeDay.day_number}.
                </p>
              ) : (
                <SharedTripMap
                  days={trip.days}
                  dayId={activeDayId}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={selectActivity}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
