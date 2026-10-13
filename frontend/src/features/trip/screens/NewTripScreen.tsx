"use client"

import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

import { BackLink } from "@/components/BackLink"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"

const TripForm = dynamic(
  () => import("@/features/trip/components/TripForm").then((module) => module.TripForm),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

export function NewTripScreen() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  return (
    <main className="mx-auto w-full max-w-2xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop">
      <BackLink href="/trips" label="Back to Trips" className="mb-4" />

      <h1 className="text-2xl font-semibold text-foreground">New trip</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set the destination and dates; you get one day per date. Add activities, bookings and expenses after.
      </p>

      <div className="mt-6 rounded-xl border bg-card p-5 md:p-6">
        <TripForm
          isSubmitting={isPending}
          onSubmit={async (input) => {
            const trip = await mutateAsync(input)
            router.push(`/trips/${trip.id}`)
          }}
        />
      </div>
    </main>
  )
}
