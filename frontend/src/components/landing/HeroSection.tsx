"use client"

import Link from "next/link"
import { Lock, Monitor, Zap, PlayCircle, Plane, MapPin, CalendarDays } from "lucide-react"
import { GoogleIcon } from "@/components/GoogleIcon"
import Image from "next/image"
import travelHeroIllustration from "@/assets/illustrations/travel-hero.png"

const TRUST_ITEMS = [
  { Icon: Lock, label: "Secure & Private" },
  { Icon: Monitor, label: "Works on all devices" },
  { Icon: Zap, label: "Offline ready" },
]

const MOCK_STATS = [
  { label: "Trips Done", value: "12", Icon: Plane },
  { label: "Countries", value: "8", Icon: MapPin },
  { label: "Days Planned", value: "94", Icon: CalendarDays },
]

export function HeroSection() {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden px-4 pb-16 pt-16 text-center md:px-8 md:pb-12 md:pt-20">
      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[160px] animate-float-orb" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-chromatic-ocean/8 blur-[160px] animate-float-orb" style={{ animationDelay: "-6s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-chromatic-aurora/6 blur-[120px] animate-float-orb" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-chromatic-sky/5 blur-[80px] animate-float-orb" style={{ animationDelay: "-9s" }} />
      </div>

      <div
        className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary animate-fade-in-up"
        role="note"
        style={{ animationDelay: "0ms" }}
      >
        <span className="flex h-2 w-2 rounded-full bg-chromatic-ocean animate-pulse" aria-hidden="true" />
        <span className="font-semibold">10,000+ trips planned this month</span>
      </div>

      <h1
        className="font-display text-4xl sm:text-5xl md:text-[68px] md:leading-[76px] text-foreground mb-6 max-w-4xl leading-tight tracking-tight text-balance animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        Plan Your Journey,{" "}
        <br className="hidden sm:block" />
        <span className="text-gradient-sunset">Own Every Moment</span>
      </h1>

      <p
        className="text-lg md:text-xl text-muted-foreground mb-10 max-w-[520px] mx-auto leading-relaxed text-balance animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        Build day-by-day itineraries, track your budget in any currency, and let
        AI craft the perfect trip — all in one beautiful place.
      </p>

      <div
        className="mb-12 flex flex-col items-center justify-center gap-3 animate-fade-in-up sm:flex-row"
        style={{ animationDelay: "240ms" }}
      >
        <Link
          href="/login"
          className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[200px] justify-center"
        >
          {/* Google G icon */}
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Start Planning — Free
        </Link>
        <a
          href="#how-it-works"
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[160px] justify-center"
        >
          <PlayCircle className="h-[18px] w-[18px] text-primary shrink-0" aria-hidden="true" />
          See how it works
        </a>
      </div>

      <div
        className="mb-8 w-full max-w-[300px] animate-fade-in-up sm:max-w-[380px] md:max-w-[460px] xl:absolute xl:right-0 xl:top-36 xl:mb-0 xl:w-[320px]"
        style={{ animationDelay: "280ms" }}
      >
        <Image
          src={travelHeroIllustration}
          alt="Traveler planning a route with a map, itinerary, and suitcase"
          priority
          className="h-auto w-full"
        />
      </div>

      <div
        className="relative w-full max-w-3xl mx-auto animate-fade-in-up"
        style={{ animationDelay: "320ms" }}
      >
        {/* Glow under card */}
        <div className="absolute inset-x-12 bottom-0 h-20 bg-primary/12 blur-3xl rounded-full" aria-hidden="true" />
        <div className="absolute inset-x-24 bottom-0 h-12 bg-chromatic-aurora/8 blur-2xl rounded-full" aria-hidden="true" />

        <div className="glass-lg relative overflow-hidden rounded-3xl shadow-2xl p-5 md:p-7">
          {/* Mock app header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Good morning, Alex 👋</p>
              <h2 className="text-lg font-bold text-foreground">Your Adventures</h2>
            </div>
            <div className="h-8 rounded-xl bg-gradient-to-r from-primary to-chromatic-aurora flex items-center justify-center gap-1.5 px-3">
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L9.5 9.5H2L7.5 14L5.5 21L12 17L18.5 21L16.5 14L22 9.5H14.5L12 2Z"/>
              </svg>
              <span className="text-white text-[11px] font-semibold">AI Generate</span>
            </div>
          </div>

          {/* Mock trip cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 to-chromatic-ocean/80 h-32 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-white text-sm font-semibold">Tokyo, Japan 🇯🇵</span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] text-white font-semibold backdrop-blur-sm">Active</span>
              </div>
              <div>
                <p className="text-white/75 text-xs mb-1.5">Dec 20 — Jan 3 · JPY</p>
                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/5 bg-white/70 rounded-full" />
                </div>
                <p className="text-white/60 text-[10px] mt-1">Day 9 of 15</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-chromatic-aurora/30 to-chromatic-sky/30 h-32 p-4 flex flex-col justify-between border border-border/30">
              <div className="flex justify-between items-start">
                <span className="text-foreground text-sm font-semibold">Paris, France 🇫🇷</span>
                <span className="rounded-full bg-primary/12 border border-primary/20 px-2.5 py-0.5 text-[10px] text-primary font-semibold">Upcoming</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1.5">Feb 14 — Feb 21 · EUR</p>
                <div className="h-1 w-full bg-muted rounded-full" />
                <p className="text-muted-foreground/60 text-[10px] mt-1">Starts in 48 days</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MOCK_STATS.map((s) => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <s.Icon className="h-4 w-4 text-primary mx-auto mb-1" aria-hidden="true" />
                <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        {TRUST_ITEMS.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary/70 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
