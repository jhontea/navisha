"use client"

import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

import { PageHeader } from "@/components/PageHeader"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"

const TripForm = dynamic(
  () => import("@/features/trip/components/TripForm").then((module) => module.TripForm),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-3xl bg-muted" aria-hidden="true" />,
  },
)

export function NewTripScreen() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  return (
    <main className="mx-auto w-full max-w-3xl px-margin-mobile pb-28 pt-6 md:px-margin-desktop md:pt-8">
      <PageHeader
        title="New trip"
        accent="from scratch"
        description="Set the destination and dates; you get one day per date. Add activities, bookings and expenses after."
      />

      <div className="rounded-3xl border bg-card p-5 shadow-card md:p-8">
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
