"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { formatDateRange } from "@/lib/utils"
import { useTrip, useDeleteTrip } from "@/features/trip/hooks/useTrips"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { TransportationSection } from "@/features/transportation/components/TransportationSection"
import { AccommodationSection } from "@/features/accommodation/components/AccommodationSection"
import { TripMap } from "@/features/map/components/TripMap"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { data: trip, isLoading, isError, error } = useTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        <div className="flex gap-2">
          <Link href={`/trips/${id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
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

      <Tabs defaultValue="itinerary" className="flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="itinerary" className="flex-1">
            Itinerary
            <span className="ml-1.5 rounded bg-background/60 px-1.5 py-0.5 text-xs data-active:bg-muted">
              {trip.days.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="transport" className="flex-1">
            Transport
          </TabsTrigger>
          <TabsTrigger value="stay" className="flex-1">
            Stay
          </TabsTrigger>
          <TabsTrigger value="map" className="flex-1">
            Map
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex-1">
            Budget
          </TabsTrigger>
        </TabsList>

        <TabsContent value="itinerary" className="pt-4">
          <div className="flex flex-col gap-3">
            {trip.days.map((d) => (
              <DayPanel
                key={d.id}
                tripId={id}
                dayId={d.id}
                dayNumber={d.day_number}
                date={d.date}
                notes={d.notes ?? ""}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transport" className="pt-4">
          <TransportationSection tripId={id} />
        </TabsContent>

        <TabsContent value="stay" className="pt-4">
          <AccommodationSection tripId={id} />
        </TabsContent>

        <TabsContent value="map" className="pt-4">
          <TripMap days={trip.days} />
        </TabsContent>

        <TabsContent value="budget" className="pt-4">
          <ExpenseSection
            tripId={id}
            tripBaseCurrency={trip.base_currency}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${trip.title}"?`}
        description="This will permanently remove the trip and all its days, activities, and expenses. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        onConfirm={onDelete}
      />
    </main>
  )
}
