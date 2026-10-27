"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { BackLink } from "@/components/BackLink"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TripHeader } from "@/features/trip/components/TripHeader"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { buildTripIcs, icsFileName } from "@/features/trip/lib/ics"
import { activityApi } from "@/features/activity/api"
import { accommodationApi } from "@/features/accommodation/api"
import { transportationApi } from "@/features/transportation/api"
import { useDeleteTrip, useDuplicateTrip, useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const TripForm = dynamic(
  () => import("@/features/trip/components/TripForm").then((m) => m.TripForm),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

const DuplicateTripForm = dynamic(
  () => import("@/features/trip/components/DuplicateTripForm").then((m) => m.DuplicateTripForm),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

/**
 * Trip shell (V3): cover hero with round buttons and a ⋯ menu, section tabs
 * (pills over the cover on desktop, floating nav on phones), and the single
 * edit path — a sheet with the full trip form.
 */
export function TripShell({ children }: { children: ReactNode }) {
  const { id: tripId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: trip, isLoading, isError, error, refetch, isFetching } = useTrip(tripId)
  const { mutateAsync: updateTrip, isPending: isUpdating } = useUpdateTrip(tripId)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()
  const { mutateAsync: duplicateTrip, isPending: isDuplicating } = useDuplicateTrip(tripId)

  const [editOpen, setEditOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)
  const queryClient = useQueryClient()

  // During persisted-query restoration there can briefly be no data while
  // isLoading is false. Keep the skeleton until data or a real error arrives.
  if (!trip && (isLoading || !isError)) {
    return (
      <div className="mx-auto w-full max-w-max-width md:px-margin-desktop md:pt-2">
        <Skeleton className="h-52 w-full rounded-none rounded-b-3xl md:h-60 md:rounded-3xl" />
        <div className="space-y-2 px-margin-mobile pt-4 md:hidden">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="mt-6 space-y-3 px-margin-mobile md:px-0">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!trip) {
    const isNotFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border bg-card shadow-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-display font-extrabold text-foreground">
            {isNotFound ? "Trip not found" : "Couldn't load this trip"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {isNotFound
              ? "This trip may have been deleted or you no longer have access to it."
              : "There may be a temporary connection or server problem. Try loading it again."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!isNotFound && isError && (
              <Button type="button" disabled={isFetching} aria-busy={isFetching} onClick={() => void refetch()}>
                <RefreshCw className={cn(isFetching && "animate-spin")} aria-hidden="true" />
                {isFetching ? "Trying again…" : "Try again"}
              </Button>
            )}
            <BackLink href="/trips" label="Back to Trips" />
          </div>
        </div>
      </div>
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
      onError: () => toast("Couldn't delete this trip. Try again.", "error"),
    })
  }

  // Fetched on click (same query keys as the tabs) so the page doesn't load bookings it isn't showing.
  const onAddToCalendar = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const [activities, transports, stays] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ["activities", "trip", tripId],
          queryFn: ({ signal }) => activityApi.listByTrip(tripId, signal),
        }),
        queryClient.fetchQuery({
          queryKey: ["transportations", "list", tripId],
          queryFn: () => transportationApi.list(tripId),
        }),
        queryClient.fetchQuery({
          queryKey: ["accommodations", "list", tripId],
          queryFn: () => accommodationApi.list(tripId),
        }),
      ])
      const { text, count } = buildTripIcs({
        trip,
        activitiesByDay: activities.items_by_day ?? {},
        transports: transports.items ?? [],
        stays: stays.items ?? [],
      })
      if (count === 0) {
        toast("No timed plans to add yet. Add times to activities or bookings first.")
        return
      }
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }))
      const link = document.createElement("a")
      link.href = url
      link.download = icsFileName(trip.title)
      link.click()
      URL.revokeObjectURL(url)
      toast("Calendar file downloaded.")
    } catch {
      toast("Couldn't export your calendar. Try again.", "error")
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <TripHeader
        trip={trip}
        onEdit={() => setEditOpen(true)}
        onDuplicate={() => setDuplicateOpen(true)}
        onAddToCalendar={() => void onAddToCalendar()}
        onDelete={() => setConfirmDelete(true)}
      />
      <TripTabBar tripId={tripId} />

      {isError && (
        <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-max-width flex-col gap-3 rounded-xl border border-warning/40 bg-warning-bg p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-foreground">Showing the last loaded trip. Recent changes may not be visible yet.</p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className={cn(isFetching && "animate-spin")} aria-hidden="true" />
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}

      {children}

      <ResponsiveSheet open={editOpen} onOpenChange={setEditOpen} title="Edit trip">
        <TripForm
          initial={trip}
          isSubmitting={isUpdating}
          onSubmit={async (input) => {
            try {
              await updateTrip(input)
              setEditOpen(false)
              toast("Trip details updated.")
            } catch (updateError) {
              const message =
                updateError instanceof ApiError && updateError.status >= 400 && updateError.status < 600
                  ? updateError.message
                  : "Couldn't save your changes. Check your connection and try again."
              toast(message, "error")
            }
          }}
        />
      </ResponsiveSheet>

      <ResponsiveSheet
        open={duplicateOpen}
        // Stay open while the copy is being made; closing would not cancel it.
        onOpenChange={(open) => !isDuplicating && setDuplicateOpen(open)}
        title="Duplicate trip"
      >
        <DuplicateTripForm
          trip={trip}
          isSubmitting={isDuplicating}
          onCancel={() => setDuplicateOpen(false)}
          onSubmit={async (input) => {
            try {
              const copy = await duplicateTrip(input)
              setDuplicateOpen(false)
              toast("Trip duplicated.")
              router.push(`/trips/${copy.id}`)
            } catch (duplicateError) {
              const message =
                duplicateError instanceof ApiError && duplicateError.status >= 400 && duplicateError.status < 600
                  ? duplicateError.message
                  : "Couldn't duplicate this trip. Check your connection and try again."
              toast(message, "error")
            }
          }}
        />
      </ResponsiveSheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${trip.title}"?`}
        description="This permanently removes the trip with all its days, activities, bookings and expenses."
        confirmLabel="Delete trip"
        destructive
        isPending={isDeleting}
        closeOnConfirm={false}
        onConfirm={onDelete}
      />
    </>
  )
}
