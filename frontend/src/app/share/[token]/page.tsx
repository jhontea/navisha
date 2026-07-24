"use client"

import { useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  ExternalLink,
  Hotel,
  Link2,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Plane,
} from "lucide-react"
import type {
  PublicAccommodation,
  PublicItinerary,
  PublicTransportation,
  PublicTripDay,
} from "@/features/trip/types"
import { canRenderTripCover } from "@/features/trip/lib/cover"
import { formatDateRange } from "@/lib/utils"

const SharedTripMap = dynamic(
  () => import("@/features/trip/components/SharedTripMap").then((module) => module.SharedTripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
      </div>
    ),
  },
)

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatDateTime(value: string | null) {
  if (!value) return "Schedule not set"
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function SharedTripPage({
  params,
}: {
  params: { token: string }
}) {
  const token = params.token
  const [trip, setTrip] = useState<PublicItinerary | null>(null)
  const [status, setStatus] = useState<
    "loading" | "ready" | "expired" | "missing"
  >("loading")
  const [section, setSection] = useState<
    "itinerary" | "transport" | "stay"
  >("itinerary")
  const [view, setView] = useState<"list" | "map">("list")

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/shared-trips/${encodeURIComponent(token)}`, {
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then(async (response) => {
        if (response.status === 410) {
          setStatus("expired")
          return
        }
        if (!response.ok) {
          setStatus("missing")
          return
        }
        setTrip(await response.json())
        setStatus("ready")
      })
      .catch(() => setStatus("missing"))
  }, [token])

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading itinerary…
        </span>
      </main>
    )
  }

  if (status !== "ready" || !trip) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Link2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-xl font-semibold">
            {status === "expired"
              ? "This link has expired"
              : "Itinerary unavailable"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the trip owner to create a new share link.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/20 pb-12">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <a
            href="/"
            aria-label="Navisha home"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-sm">
              <Compass className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="text-gradient-sunset text-[15px] font-bold tracking-tight">
              Navisha
            </span>
          </a>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Read-only trip
          </span>
        </div>
      </header>

      <section className="relative mx-auto min-h-64 max-w-4xl overflow-hidden md:mt-6 md:rounded-3xl">
        {canRenderTripCover(trip.cover_image_url) ? (
          <>
            <Image
              src={trip.cover_image_url}
              alt=""
              fill
              unoptimized
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean" />
        )}
        <div className="relative flex min-h-64 flex-col justify-end p-6 text-white md:p-8">
          <p className="mb-2 flex items-center gap-1.5 text-sm text-white/80">
            <MapPin className="h-4 w-4" />
            {trip.description}
          </p>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">
            {trip.title}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/90">
            <CalendarDays className="h-4 w-4" />
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div
          role="tablist"
          aria-label="Shared trip sections"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-border/40 bg-background p-1 shadow-sm"
        >
          <SectionTab
            active={section === "itinerary"}
            onClick={() => setSection("itinerary")}
            icon={<List />}
            label="Itinerary"
            count={trip.days.length}
          />
          <SectionTab
            active={section === "transport"}
            onClick={() => setSection("transport")}
            icon={<Plane />}
            label="Transport"
            count={trip.transportations?.length ?? 0}
          />
          <SectionTab
            active={section === "stay"}
            onClick={() => setSection("stay")}
            icon={<Hotel />}
            label="Stay"
            count={trip.accommodations?.length ?? 0}
          />
        </div>

        {section === "itinerary" && (
          <SharedItinerary
            days={trip.days}
            view={view}
            onViewChange={setView}
          />
        )}
        {section === "transport" && (
          <SharedTransport items={trip.transportations ?? []} />
        )}
        {section === "stay" && (
          <SharedStay items={trip.accommodations ?? []} />
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          This link expires {new Date(trip.expires_at).toLocaleString()}.
        </p>
      </section>
    </main>
  )
}

function SectionTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count: number
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="truncate">{label}</span>
      <span
        className={`hidden rounded-full px-1.5 py-0.5 text-[10px] sm:inline ${
          active ? "bg-white/20" : "bg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function SharedItinerary({
  days,
  view,
  onViewChange,
}: {
  days: PublicTripDay[]
  view: "list" | "map"
  onViewChange: (view: "list" | "map") => void
}) {
  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Itinerary view"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-border/40 bg-muted/30 p-1"
      >
        <ViewButton
          active={view === "list"}
          onClick={() => onViewChange("list")}
          icon={<List />}
          label="List"
        />
        <ViewButton
          active={view === "map"}
          onClick={() => onViewChange("map")}
          icon={<MapIcon />}
          label="Map"
        />
      </div>
      {view === "map" ? (
        <div className="h-[560px] overflow-hidden rounded-2xl border bg-background shadow-sm">
          <SharedTripMap days={days} />
        </div>
      ) : (
        days.map((day) => <SharedDay key={day.id} day={day} />)
      )}
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {label}
    </button>
  )
}

function SharedDay({ day }: { day: PublicTripDay }) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="border-b bg-muted/35 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Day {day.day_number}
        </p>
        <h2 className="mt-0.5 font-heading font-semibold">
          {day.title || formatDay(day.date)}
        </h2>
        {day.title && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDay(day.date)}
          </p>
        )}
      </div>
      <div className="divide-y">
        {day.activities.length ? (
          day.activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-medium">{activity.title}</h3>
                  {activity.start_time && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {activity.start_time}
                      {activity.end_time ? `–${activity.end_time}` : ""}
                    </span>
                  )}
                </div>
                {activity.payload.address && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.payload.address}
                  </p>
                )}
                {activity.payload.external_url && (
                  <a
                    href={activity.payload.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Visit website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No shared activities for this day.
          </p>
        )}
      </div>
    </article>
  )
}

function SharedTransport({ items }: { items: PublicTransportation[] }) {
  if (!items.length) {
    return (
      <EmptySection
        icon={<Plane />}
        title="No transport shared"
        description="Transport details have not been added to this trip."
      />
    )
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border bg-background p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chromatic-sky/10 text-chromatic-sky">
              <Plane className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.type}
                  </p>
                  <h2 className="font-heading font-semibold">
                    {item.label || item.operator || "Transport"}
                  </h2>
                  {item.operator && item.label && (
                    <p className="text-xs text-muted-foreground">
                      {item.operator}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.departure_datetime)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-muted/35 p-3">
                <LocationLabel label="From" value={item.from_location} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <LocationLabel label="To" value={item.to_location} alignRight />
              </div>
              {item.arrival_datetime && (
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  Arrives {formatDateTime(item.arrival_datetime)}
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function LocationLabel({
  label,
  value,
  alignRight = false,
}: {
  label: string
  value: string
  alignRight?: boolean
}) {
  return (
    <div className={alignRight ? "text-right" : undefined}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value || "Not set"}</p>
    </div>
  )
}

function SharedStay({ items }: { items: PublicAccommodation[] }) {
  if (!items.length) {
    return (
      <EmptySection
        icon={<Hotel />}
        title="No stay shared"
        description="Accommodation details have not been added to this trip."
      />
    )
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border bg-background p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chromatic-aurora/10 text-chromatic-aurora">
              <Hotel className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {item.accommodation_type}
              </p>
              <h2 className="font-heading font-semibold">{item.name}</h2>
              {item.location_name && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.location_name}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Check-in {formatDay(item.check_in)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Check-out {formatDay(item.check_out)}
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function EmptySection({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-background px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <h2 className="font-heading font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
