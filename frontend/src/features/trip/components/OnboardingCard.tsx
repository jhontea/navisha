"use client"

import Link from "next/link"
import { PenLine, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

/** First-run state on the Trips page: the two ways to start a trip. */
export function OnboardingCard({ userName }: { userName?: string }) {
  return (
    <section aria-labelledby="onboarding-heading" className="rounded-xl border bg-card p-6 md:p-8">
      <h2 id="onboarding-heading" className="text-xl font-semibold text-foreground">
        {userName ? `Welcome, ${userName}` : "Welcome to Navisha"}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Plan each day, see it on a map, and track spending in your currency. Start with your first trip.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/trips/generate" className={buttonVariants()}>
          <Sparkles aria-hidden="true" />
          Generate with AI
        </Link>
        <Link href="/trips/new" className={buttonVariants({ variant: "outline" })}>
          <PenLine aria-hidden="true" />
          Start from scratch
        </Link>
      </div>
    </section>
  )
}
