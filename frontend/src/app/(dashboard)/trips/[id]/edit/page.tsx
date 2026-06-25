"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { TripForm } from "@/features/trip/components/TripForm"
import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"

export default function EditTripPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { data: trip, isLoading, isError, error } = useTrip(id)
  const { mutateAsync, isPending } = useUpdateTrip(id)

  if (isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>
  }
  if (isError || !trip) {
    return (
      <p className="p-8 text-sm text-destructive">
        {error?.message ?? "Trip not found"}
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/trips/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to trip
        </Link>
        <h1 className="mt-2 font-headline-md text-headline-md">Edit trip</h1>
      </div>
      <TripForm
        initial={trip}
        isSubmitting={isPending}
        onSubmit={async (input) => {
          await mutateAsync(input)
          router.push(`/trips/${id}`)
        }}
      />
    </main>
  )
}
