"use client"

import { useAuth } from "@/features/auth/hooks"
import { TripList } from "@/features/trip/components/TripList"
import { StatsSection } from "@/features/trip/components/StatsSection"
import { TripCTAs } from "@/features/trip/components/TripCTAs"
import { Compass, Sparkles } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "traveler"

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      {/* ── Greeting Header ── */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-body-lg text-muted-foreground">
            Good to see you, {firstName} 👋
          </p>
          <h1 className="text-headline-lg-mobile md:text-display font-heading text-gradient-sunset">
            Your Adventures
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TripCTAs />
        </div>
      </header>

      {/* ── Quick Actions ── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/trips/generate"
          className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all hover:bg-white/25 hover:shadow-chromatic"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">AI Generate</p>
            <p className="text-sm text-muted-foreground">Describe your dream trip</p>
          </div>
        </Link>
        <Link
          href="/trips/new"
          className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all hover:bg-white/25 hover:shadow-chromatic"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-chromatic-ocean to-chromatic-ocean-end text-white shadow-md">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Plan Manually</p>
            <p className="text-sm text-muted-foreground">Build it step by step</p>
          </div>
        </Link>
      </div>

      <TripList />
      <div className="h-16" />
      <StatsSection />
    </div>
  )
}
