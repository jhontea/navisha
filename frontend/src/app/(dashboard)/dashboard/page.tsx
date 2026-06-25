"use client"

import { useAuth } from "@/features/auth/hooks"
import { TripList } from "@/features/trip/components/TripList"
import { StatsSection } from "@/features/trip/components/StatsSection"
import { TripCTAs } from "@/features/trip/components/TripCTAs"

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? "traveler"

  return (
    <div className="mx-auto max-w-max-width w-full px-margin-mobile md:px-margin-desktop pt-8 pb-24">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-surface">
            Your Adventures
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Ready to explore, {firstName}?
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TripCTAs />
        </div>
      </header>


      <TripList />
      <div className="h-16" />
      <StatsSection />
    </div>
  )
}
