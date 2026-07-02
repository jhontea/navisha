"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useTrip, useUpdateTrip, useDeleteTrip } from "@/features/trip/hooks/useTrips"
import { DestinationAutocomplete } from "@/features/trip/components/DestinationAutocomplete"
import { cn } from "@/lib/utils"
import { AccommodationSection } from "@/features/accommodation/components/AccommodationSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSlideDirection } from "@/hooks/useSlideDirection"

export default function TripStayPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const slideClass = useSlideDirection()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCover, setEditCover] = useState("")

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
      {trip && (
        <TripHero
          title={trip.title}
          description={trip.description}
          startDate={trip.start_date}
          endDate={trip.end_date}
          baseCurrency={trip.base_currency}
          coverImageUrl={trip.cover_image_url}
          onEdit={startEditing}
          onDelete={() => setConfirmDelete(true)}
          isDeleting={isDeleting}
        />
      )}
      {!trip && isLoading && (
        <Skeleton variant="glass" className="h-40 w-full rounded-none" />
      )}

      <TripTabBar tripId={id} />

      <div className={cn("mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in", slideClass)}>
        <AccommodationSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
        />
      </div>

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

      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title="Edit Trip">
        <div className="space-y-3">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Trip title"
            className="w-full rounded-lg border border-primary bg-background px-3 py-1.5 text-lg font-bold focus:outline-none"
            disabled={isUpdating}
          />
          <DestinationAutocomplete
            value={editDescription}
            onChange={setEditDescription}
            onSelect={(place) => {
              setEditDescription(place.description)
              setEditCover(place.photoUrl || "")
            }}
            placeholder="Search city, province, or country"
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          {editCover && (
            <div className="relative h-28 w-full overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editCover} alt="Cover preview" className="h-full w-full object-cover" onError={() => setEditCover("")} />
              <button type="button" onClick={() => setEditCover("")} className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70">Remove</button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start date</label>
              <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none" disabled={isUpdating} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End date</label>
              <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none" disabled={isUpdating} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={saveEdits} disabled={isUpdating || !editTitle.trim()} className="flex-1">
              <Check className="h-4 w-4" /> {isUpdating ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
    </main>
  )
}
