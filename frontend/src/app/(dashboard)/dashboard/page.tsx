"use client"

import Link from "next/link"
import { useAuth } from "@/features/auth/hooks"
import { TripList } from "@/features/trip/components/TripList"
import { StatsSection } from "@/features/trip/components/StatsSection"

// Material Symbols icon component
function MaterialIcon({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      data-icon={name}
    >
      {name}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "traveler"

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-surface">
            Welcome back, {firstName}
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Where are we exploring next?
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/trips/generate">
            <button
              type="button"
              className="flex items-center justify-center gap-2 border border-primary text-primary px-6 py-3 rounded-xl font-label-md text-label-md hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <MaterialIcon name="auto_fix_high" size={20} />
              Generate Trip with AI
            </button>
          </Link>
          <Link href="/trips/new">
            <button
              type="button"
              className="flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <MaterialIcon name="add" size={20} />
              New Trip
            </button>
          </Link>
        </div>
      </header>


      <TripList />
      <div style={{ height: '4rem' }} />
      <StatsSection />
    </div>
  )
}
