"use client"

import { SegmentedControl } from "@/components/SegmentedControl"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Compass, List, Map as MapIcon, MapPin } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ItineraryFocusProvider, useItineraryFocus } from "@/features/activity/ItineraryFocus"
import { formatTripRange } from "../../lib/home"
import { getTripDateMetrics } from "../../lib/status"
import { resolveTripCover } from "../../lib/cover"
import { hasValidCoords } from "../../lib/mapsUrl"
import { defaultOpenDayId } from "../../lib/sharedTrip"
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
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-max-width items-center justify-between gap-3 px-margin-mobile py-2 md:px-margin-desktop">
            <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Navisha home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-foreground">Navisha</span>
              <span className="hidden text-sm text-muted-foreground sm:inline">· Shared trip</span>
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
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
  const cover = resolveTripCover(trip.cover_image_url, trip.description, 1280)
  const { totalDays } = getTripDateMetrics(trip.start_date, trip.end_date)
  const meta = `${formatTripRange(trip.start_date, trip.end_date)} · ${totalDays} ${totalDays === 1 ? "day" : "days"}`

  if (!cover) {
    return (
      <section className="mt-6 rounded-xl border bg-card p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{trip.title}</h1>
        {trip.description && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {trip.description}
          </p>
        )}
        <p className="mt-2 text-sm text-foreground tabular-nums">{meta}</p>
      </section>
    )
  }

  return (
    <section className="relative mt-6 overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" aria-hidden="true" />
      <div className="relative flex min-h-56 flex-col justify-end p-5 text-white md:min-h-64 md:p-6">
        {trip.description && (
          <p className="flex items-center gap-1.5 text-sm text-white/90">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {trip.description}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{trip.title}</h1>
        <p className="mt-1 text-sm text-white/90 tabular-nums">{meta}</p>
      </div>
    </section>
  )
}

function Body({ trip }: { trip: PublicItinerary }) {
  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  const { activeDayId, setActiveDayId, selectedActivityId, selectActivity } = useItineraryFocus()
  // One day open at first: Day 1 when rendered, then today's day once the
  // browser knows the date (the server may be in another time zone).
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set(trip.days.slice(0, 1).map((d) => d.id)))
  const allOpen = trip.days.length > 0 && openDays.size === trip.days.length
  const transportations = trip.transportations ?? []
  const accommodations = trip.accommodations ?? []
  const activeDay = trip.days.find((d) => d.id === activeDayId)
  const dayHasPlaces = (d: PublicItinerary["days"][number]) => d.activities.some((a) => hasValidCoords(a.payload.lat, a.payload.lng))
  const hasPlaces = trip.days.some(dayHasPlaces)

  useEffect(() => {
    const id = defaultOpenDayId(trip.days)
    if (id && id !== trip.days[0]?.id) {
      setOpenDays(new Set([id]))
      setActiveDayId(id)
    }
  }, [trip.days, setActiveDayId])

  const setDayOpen = (id: string, open: boolean) =>
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })

  // A marker click on desktop brings its card into view.
  useEffect(() => {
    if (selectedActivityId) {
      document.getElementById(`activity-${selectedActivityId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedActivityId])

  if (trip.days.length === 0) {
    return <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">This trip has no days yet.</p>
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
        <div className="h-[70vh] overflow-hidden rounded-xl border lg:hidden">
          <SharedTripMap days={trip.days} />
        </div>
      )}

      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]", mobileView === "map" && "max-lg:hidden")}>
        <div className="flex min-w-0 flex-col gap-3">
          {trip.days.length > 1 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenDays(allOpen ? new Set() : new Set(trip.days.map((d) => d.id)))}
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
            </div>
          )}
          {trip.days.map((day) => (
            <SharedDay
              key={day.id}
              day={day}
              transportations={transportations}
              accommodations={accommodations}
              open={openDays.has(day.id)}
              onOpenChange={(open) => setDayOpen(day.id, open)}
            />
          ))}
        </div>

        {hasPlaces && (
          <aside
            aria-label="Map of the selected day"
            className="sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border bg-card lg:flex"
          >
            <p className="border-b px-4 py-2.5 text-sm font-semibold text-foreground">
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
