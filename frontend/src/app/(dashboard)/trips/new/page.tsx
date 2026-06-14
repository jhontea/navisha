"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { TripForm } from "@/features/trip/components/TripForm"
import { useCreateTrip } from "@/features/trip/hooks/useTrips"

export default function NewTripPage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to trips
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New trip</h1>
      </div>
      <TripForm
        isSubmitting={isPending}
        onSubmit={async (input) => {
          const trip = await mutateAsync(input)
          router.push(`/trips/${trip.id}`)
        }}
      />
    </main>
  )
}
