"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatDateRange } from "@/lib/utils"
import { useTrip, useDeleteTrip } from "@/features/trip/hooks/useTrips"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { useRouter } from "next/navigation"

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { data: trip, isLoading, isError, error } = useTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()

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

  const onDelete = () => {
    if (!confirm("Delete this trip? This cannot be undone.")) return
    deleteTrip(id, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to trips
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <Badge variant="secondary">{trip.base_currency}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(trip.start_date, trip.end_date)}
          </p>
          {trip.description && (
            <p className="text-sm text-muted-foreground">{trip.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
      </header>

      {trip.notes && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-2 text-sm font-semibold">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {trip.notes}
            </p>
          </section>
        </>
      )}

      <Separator className="my-6" />

      <section>
        <h2 className="mb-3 text-sm font-semibold">
          Itinerary · {trip.days.length} day{trip.days.length !== 1 ? "s" : ""}
        </h2>
        <div className="flex flex-col gap-3">
          {trip.days.map((d) => (
            <DayPanel
              key={d.id}
              dayId={d.id}
              dayNumber={d.day_number}
              date={d.date}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
