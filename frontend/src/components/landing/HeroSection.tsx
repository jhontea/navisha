"use client"

import Link from "next/link"
import { Lock, Monitor, Zap, CreditCard, PlayCircle, Plane, MapPin, DollarSign } from "lucide-react"

const TRUST_ITEMS = [
  { Icon: Lock, label: "Secure & Private" },
  { Icon: Monitor, label: "Works on all devices" },
  { Icon: Zap, label: "Offline ready" },
  { Icon: CreditCard, label: "Free to start" },
]

// Iter 11 — mock stats use Lucide icons instead of material-symbols
const MOCK_STATS = [
  { label: "Trips Done", value: "12", Icon: Plane },
  { label: "Countries", value: "8", Icon: MapPin },
  { label: "Days Planned", value: "94", Icon: DollarSign },
]

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center text-center py-20 md:py-32 max-w-6xl mx-auto px-4 md:px-8 overflow-hidden">
      {/* Iter 12 — animated gradient blobs: larger, softer, more layers */}
      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[160px] animate-float-orb" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-[hsl(185,80%,40%)]/8 blur-[160px] animate-float-orb" style={{ animationDelay: "-6s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[hsl(250,70%,55%)]/6 blur-[120px] animate-float-orb" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-[hsl(200,90%,60%)]/5 blur-[80px] animate-float-orb" style={{ animationDelay: "-9s" }} />
      </div>

      {/* Iter 13 — social proof badge: more polished pill with count */}
      <div
        className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary animate-fade-in-up"
        role="note"
        style={{ animationDelay: "0ms" }}
      >
        <span className="flex h-2 w-2 rounded-full bg-[hsl(185,80%,40%)] animate-pulse" aria-hidden="true" />
        <span className="font-semibold">10,000+ trips planned this month</span>
        <span className="hidden sm:inline text-primary/60">•</span>
        <span className="hidden sm:inline text-primary/80 font-medium">Join free</span>
      </div>

      {/* Iter 14 — headline: tighter tracking, better line-height */}
      <h1
        className="font-display text-4xl sm:text-5xl md:text-[68px] md:leading-[76px] text-foreground mb-6 max-w-4xl leading-tight tracking-tight text-balance animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        Plan Your Journey,{" "}
        <br className="hidden sm:block" />
        <span className="text-gradient-sunset">Own Every Moment</span>
      </h1>

      {/* Iter 15 — subtitle: slightly larger, better max-width */}
      <p
        className="text-lg md:text-xl text-muted-foreground mb-10 max-w-[520px] mx-auto leading-relaxed text-balance animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        Build day-by-day itineraries, track your budget in any currency, and let
        AI craft the perfect trip — all in one beautiful place.
      </p>

      {/* Iter 16 — CTAs: refined sizes, better gap, loading state hint */}
      <div
        className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-16 animate-fade-in-up"
        style={{ animationDelay: "240ms" }}
      >
        <Link
          href="/login"
          className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-[hsl(250,70%,55%)] to-[hsl(185,80%,40%)] px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[200px] justify-center"
        >
          {/* Google G icon */}
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Start Planning — Free
        </Link>
        <a
          href="#features"
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[160px] justify-center"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
          }}
        >
          <PlayCircle className="h-[18px] w-[18px] text-primary shrink-0" aria-hidden="true" />
          See how it works
        </a>
      </div>

      {/* Iter 17 — App preview: bigger, better mock content, no material icons */}
      <div
        className="relative w-full max-w-3xl mx-auto animate-fade-in-up"
        style={{ animationDelay: "320ms" }}
      >
        {/* Glow under card */}
        <div className="absolute inset-x-12 bottom-0 h-20 bg-primary/12 blur-3xl rounded-full" aria-hidden="true" />
        <div className="absolute inset-x-24 bottom-0 h-12 bg-[hsl(250,70%,55%)]/8 blur-2xl rounded-full" aria-hidden="true" />

        <div className="glass-lg relative overflow-hidden rounded-3xl shadow-2xl p-5 md:p-7">
          {/* Mock app header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Good morning, Alex 👋</p>
              <h2 className="text-lg font-bold text-foreground">Your Adventures</h2>
            </div>
            {/* Iter 11 — AI Generate badge: inline SVG sparkle instead of material */}
            <div className="h-8 rounded-xl bg-gradient-to-r from-primary to-[hsl(250,70%,55%)] flex items-center justify-center gap-1.5 px-3">
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L9.5 9.5H2L7.5 14L5.5 21L12 17L18.5 21L16.5 14L22 9.5H14.5L12 2Z"/>
              </svg>
              <span className="text-white text-[11px] font-semibold">AI Generate</span>
            </div>
          </div>

          {/* Mock trip cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 to-[hsl(185,80%,40%)]/80 h-32 p-4 flex flex-col justify-between">
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(250,70%,55%)]/30 to-[hsl(200,90%,60%)]/30 h-32 p-4 flex flex-col justify-between border border-border/30">
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

          {/* Iter 17 — Mock stats row: Lucide icons */}
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

      {/* Iter 18 — Trust bar: larger gap, better vertical alignment */}
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
