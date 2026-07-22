"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock3, Compass, ExternalLink, Link2, List, Loader2, Map as MapIcon, MapPin } from "lucide-react"
import type { PublicItinerary } from "@/features/trip/types"
import { canRenderTripCover } from "@/features/trip/lib/cover"
import { formatDateRange } from "@/lib/utils"
import { SharedTripMap } from "@/features/trip/components/SharedTripMap"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
}

export default function SharedTripPage({ params }: { params: { token: string } }) {
  const token = params.token
  const [trip, setTrip] = useState<PublicItinerary | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "missing">("loading")
  const [view, setView] = useState<"list" | "map">("list")

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/shared-trips/${encodeURIComponent(token)}`, { cache: "no-store", referrerPolicy: "no-referrer" })
      .then(async (response) => {
        if (response.status === 410) { setStatus("expired"); return }
        if (!response.ok) { setStatus("missing"); return }
        setTrip(await response.json()); setStatus("ready")
      })
      .catch(() => setStatus("missing"))
  }, [token])

  if (status === "loading") return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Loading itinerary…</span></main>
  if (status !== "ready" || !trip) return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Link2 className="h-6 w-6 text-muted-foreground" /></div><h1 className="font-heading text-xl font-semibold">{status === "expired" ? "This link has expired" : "Itinerary unavailable"}</h1><p className="mt-2 text-sm text-muted-foreground">Ask the trip owner to create a new share link.</p></div>
    </main>
  )

  return (
    <main className="min-h-screen bg-muted/20 pb-12">
      <header className="border-b bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3"><a href="/" aria-label="Navisha home" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-sm"><Compass className="h-4 w-4 text-white" aria-hidden="true" /></span><span className="text-gradient-sunset text-[15px] font-bold tracking-tight">Navisha</span></a><span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Read-only itinerary</span></div></header>
      <section className="relative mx-auto min-h-64 max-w-4xl overflow-hidden md:mt-6 md:rounded-3xl">
        {canRenderTripCover(trip.cover_image_url) ? <><img src={trip.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" /></> : <div className="absolute inset-0 bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean" />}
        <div className="relative flex min-h-64 flex-col justify-end p-6 text-white md:p-8"><p className="mb-2 flex items-center gap-1.5 text-sm text-white/80"><MapPin className="h-4 w-4" />{trip.description}</p><h1 className="font-heading text-3xl font-bold md:text-4xl">{trip.title}</h1><p className="mt-3 flex items-center gap-2 text-sm text-white/90"><CalendarDays className="h-4 w-4" />{formatDateRange(trip.start_date, trip.end_date)}</p></div>
      </section>
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div role="group" aria-label="Itinerary view" className="grid grid-cols-2 gap-1 rounded-2xl border border-border/40 bg-muted/30 p-1">
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${view === "list" ? "bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/25" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}><List className="h-4 w-4" /> List</button>
          <button type="button" onClick={() => setView("map")} aria-pressed={view === "map"} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${view === "map" ? "bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/25" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}><MapIcon className="h-4 w-4" /> Map</button>
        </div>
        {view === "map" ? <div className="h-[560px] overflow-hidden rounded-2xl border bg-background shadow-sm"><SharedTripMap days={trip.days} /></div> : trip.days.map((day) => <article key={day.id} className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="border-b bg-muted/35 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Day {day.day_number}</p><h2 className="mt-0.5 font-heading font-semibold">{day.title || formatDay(day.date)}</h2>{day.title && <p className="mt-0.5 text-xs text-muted-foreground">{formatDay(day.date)}</p>}</div>
          <div className="divide-y">{day.activities.length ? day.activities.map((activity) => <div key={activity.id} className="flex gap-3 p-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium">{activity.title}</h3>{activity.start_time && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{activity.start_time}{activity.end_time ? `–${activity.end_time}` : ""}</span>}</div>{activity.payload.address && <p className="mt-1 text-xs text-muted-foreground">{activity.payload.address}</p>}{activity.payload.external_url && <a href={activity.payload.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Visit website <ExternalLink className="h-3 w-3" /></a>}</div>
          </div>) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No shared activities for this day.</p>}</div>
        </article>)}
        <p className="pt-2 text-center text-xs text-muted-foreground">This link expires {new Date(trip.expires_at).toLocaleString()}.</p>
      </section>
    </main>
  )
}
