"use client"

import Link from "next/link"
import { Sparkles, PenLine } from "lucide-react"

/** Welcome card shown to first-time users on the dashboard.
 *  Replaces the empty "No trips yet" state with a guided onboarding experience. */
export function OnboardingCard({ userName }: { userName?: string }) {
  const name = userName ?? "traveler"

  return (
    <div className="glass-lg relative overflow-hidden rounded-3xl p-8 md:p-10 mb-10">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-chromatic-primary/10 blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-chromatic-ocean/8 blur-[80px]" />

      <div className="relative z-10">
        <h2 className="text-headline-md md:text-headline-lg font-heading text-foreground mb-2">
          Welcome to Navisha, {name}! 👋
        </h2>
        <p className="text-body-lg text-muted-foreground mb-8 max-w-xl">
          Your adventures start here. Plan your first trip and let us handle the details.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/trips/generate"
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-chromatic-sunset/20 transition-all hover:shadow-lg hover:shadow-chromatic-sunset/30 active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Generate with AI
            <span className="text-xs font-normal opacity-80">— recommended</span>
          </Link>
          <Link
            href="/trips/new"
            className="glass flex items-center gap-3 rounded-xl px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-white/25 active:scale-[0.98]"
          >
            <PenLine className="h-5 w-5 text-chromatic-sky" />
            Plan Manually
          </Link>
        </div>
      </div>
    </div>
  )
}
