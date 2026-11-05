"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { loadOrOffline } from "@/lib/loadOrOffline"
import { startRouteProgress } from "@/lib/routeProgress"

import { PageHeader } from "@/components/PageHeader"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"

const TripForm = dynamic(
  () => loadOrOffline(() => import("@/features/trip/components/TripForm").then((module) => module.TripForm)),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-3xl bg-skeleton" aria-hidden="true" />,
  },
)

export function NewTripScreen() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()
  // Stays true until the new trip page renders, so the button cannot create a second trip meanwhile.
  const [isNavigating, startTransition] = useTransition()

  return (
    <main className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop md:pt-8">
      <PageHeader
        title="New trip"
        accent="from scratch"
        description="Set the destination and dates; you get one day per date. Add activities, bookings and expenses after."
      />

      <div className="rounded-3xl border bg-card p-5 shadow-card md:p-8">
        <TripForm
          isSubmitting={isPending || isNavigating}
          onCancel={() => router.back()}
          onSubmit={async (input) => {
            // A failure throws to TripForm, which shows it inline and keeps its values.
            const trip = await mutateAsync(input)
            startRouteProgress()
            startTransition(() => router.push(`/trips/${trip.id}`))
          }}
        />
      </div>
    </main>
  )
}
