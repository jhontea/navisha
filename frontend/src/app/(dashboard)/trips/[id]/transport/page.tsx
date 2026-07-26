"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTrip, useUpdateTrip, useDeleteTrip } from "@/features/trip/hooks/useTrips"
import { getTripSaveDisabledReason } from "@/features/trip/lib/actionability"
import { TransportationSection } from "@/features/transportation/components/TransportationSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TripEditForm } from "@/features/trip/components/TripEditForm"

export default function TripTransportPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCover, setEditCover] = useState("")
  const tripSaveDisabledReason = getTripSaveDisabledReason({
    title: editTitle,
    startDate: editStartDate,
    endDate: editEndDate,
  })

  const startEditing = () => {
    if (!trip) return
    setEditTitle(trip.title)
    setEditDescription(trip.description ?? "")
    setEditStartDate(trip.start_date)
    setEditEndDate(trip.end_date)
    setEditCover(trip.cover_image_url ?? "")
    setIsEditing(true)
  }

  const saveEdits = () => {
    if (!editTitle.trim() || !trip) return
    updateTrip(
      {
        title: editTitle.trim(),
        description: editDescription,
        start_date: editStartDate,
        end_date: editEndDate,
        base_currency: trip.base_currency,
        budget: trip.budget,
        cover_image_url: editCover,
        notes: trip.notes,
      },
      { onSettled: () => setIsEditing(false) },
    )
  }

  const onDelete = () => {
    deleteTrip(id, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  return (
    <main className="flex flex-col pb-4">
      {trip && (isEditing ? (
        <TripEditForm
          title={editTitle}
          description={editDescription}
          coverImageUrl={editCover}
          startDate={editStartDate}
          endDate={editEndDate}
          isUpdating={isUpdating}
          saveDisabledReason={tripSaveDisabledReason}
          onTitleChange={setEditTitle}
          onDescriptionChange={setEditDescription}
          onCoverChange={setEditCover}
          onDateChange={(range) => {
            setEditStartDate(range.startDate)
            setEditEndDate(range.endDate)
          }}
          onSave={saveEdits}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <TripHero
          title={trip.title}
          description={trip.description}
          startDate={trip.start_date}
          endDate={trip.end_date}
          baseCurrency={trip.base_currency}
          coverImageUrl={trip.cover_image_url}
          shareTripId={id}
          onEdit={startEditing}
          onDelete={() => setConfirmDelete(true)}
          isDeleting={isDeleting}
        />
      ))}
      {!trip && isLoading && (
        <Skeleton variant="glass" className="h-40 w-full rounded-none" />
      )}

      <TripTabBar tripId={id} />

      {isLoading && !trip ? (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 space-y-10 animate-fade-in">
          <div>
            <div className="h-6 w-40 rounded bg-muted animate-pulse mb-4" />
            <div className="rounded-2xl border border-border/40 bg-card p-8 animate-pulse">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted" />
              <div className="mx-auto mt-4 h-4 w-32 rounded bg-muted" />
            </div>
          </div>
          <div>
            <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl border border-border/20 bg-card animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in">
          <TransportationSection
            tripId={id}
            tripBaseCurrency={trip?.base_currency ?? "IDR"}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${trip?.title}"?`}
        description="This will permanently remove the trip and all its days, activities, and expenses. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        onConfirm={onDelete}
      />

    </main>
  )
}
