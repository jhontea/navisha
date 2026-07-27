"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { BackLink } from "@/components/BackLink"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TripEditForm } from "@/features/trip/components/TripEditForm"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { useDeleteTrip, useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { getTripSaveDisabledReason } from "@/features/trip/lib/actionability"
import { resolveTripCover } from "@/features/trip/lib/cover"
import { ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

export default function TripDetailLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const tripId = params.id
  const isStandaloneEditPage = pathname.endsWith("/edit")
  const {
    data: trip,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTrip(tripId)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(tripId)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCover, setEditCover] = useState("")
  const saveDisabledReason = getTripSaveDisabledReason({
    title: editTitle,
    startDate: editStartDate,
    endDate: editEndDate,
  })

  if (isStandaloneEditPage) return children

  if (isLoading && !trip) {
    return (
      <div className="flex flex-col">
        <Skeleton variant="glass" className="h-[220px] w-full rounded-none md:mx-auto md:h-[240px] md:max-w-max-width md:rounded-2xl" />
        <div className="mx-auto mt-2 w-full max-w-max-width px-margin-mobile md:px-margin-desktop">
          <Skeleton variant="glass" className="h-12 w-full rounded-xl" />
          <div className="mt-6 space-y-3">
            <Skeleton variant="glass" className="h-28 w-full rounded-2xl" />
            <Skeleton variant="glass" className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!trip) {
    const isNotFound = error instanceof ApiError && error.status === 404

    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center px-4 py-10 md:px-10">
        <div className="glass-lg w-full rounded-2xl border border-border/50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            {isNotFound ? "Trip not found" : "Couldn’t load this trip"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {isNotFound
              ? "This trip may have been deleted or you may no longer have access to it."
              : "There may be a temporary connection or server problem. Try loading it again."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!isNotFound && isError && (
              <Button
                type="button"
                variant="gradient"
                className="rounded-full px-5"
                disabled={isFetching}
                aria-busy={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
                {isFetching ? "Trying again…" : "Try again"}
              </Button>
            )}
            <BackLink href="/trips" label="Back to My Trips" variant="glass" />
          </div>
        </div>
      </div>
    )
  }

  const startEditing = () => {
    setEditTitle(trip.title)
    setEditDescription(trip.description ?? "")
    setEditStartDate(trip.start_date)
    setEditEndDate(trip.end_date)
    setEditCover(resolveTripCover(trip.cover_image_url, trip.description))
    setIsEditing(true)
  }

  const saveEdits = () => {
    if (!editTitle.trim() || isUpdating) return
    updateTrip(
      {
        title: editTitle.trim(),
        description: editDescription,
        start_date: editStartDate,
        end_date: editEndDate,
        base_currency: trip.base_currency,
        budget: trip.budget,
        cover_image_url: editCover || resolveTripCover(trip.cover_image_url, editDescription),
        notes: trip.notes,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          toast("Trip details updated.")
        },
        onError: (updateError) => {
          const message =
            updateError instanceof ApiError && updateError.status >= 400 && updateError.status < 500
              ? updateError.message
              : "Couldn’t save your changes. Please check your connection and try again."
          toast(message, "error")
        },
      },
    )
  }

  const onDelete = () => {
    if (isDeleting) return
    deleteTrip(tripId, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast("Trip deleted.")
        router.push("/trips")
      },
      onError: () => {
        toast("Couldn’t delete this trip. Please try again.", "error")
      },
    })
  }

  return (
    <>
      {isEditing ? (
        <TripEditForm
          title={editTitle}
          description={editDescription}
          coverImageUrl={editCover}
          startDate={editStartDate}
          endDate={editEndDate}
          isUpdating={isUpdating}
          saveDisabledReason={saveDisabledReason}
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
          shareTripId={tripId}
          onEdit={startEditing}
          onDelete={() => setConfirmDelete(true)}
          isDeleting={isDeleting}
        />
      )}

      <TripTabBar tripId={tripId} />

      {isError && (
        <div className="mx-auto mt-5 flex w-[calc(100%-2rem)] max-w-max-width flex-col gap-3 rounded-2xl border border-chromatic-amber/30 bg-chromatic-amber/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chromatic-amber" aria-hidden="true" />
            <p className="text-foreground">Showing the last loaded trip data. Some recent changes may not be visible yet.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start rounded-full px-3 sm:self-auto"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden="true" />
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}

      {children}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${trip.title}"?`}
        description="This will permanently remove the trip and all its days, activities, and expenses. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        closeOnConfirm={false}
        onConfirm={onDelete}
      />
    </>
  )
}
