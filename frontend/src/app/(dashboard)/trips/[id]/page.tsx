"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import {
  Check,
  List,
  Map,
} from "lucide-react"
import { BackLink } from "@/components/BackLink"
import { BottomSheet } from "@/components/BottomSheet"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { useTrip, useDeleteTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { DestinationAutocomplete } from "@/features/trip/components/DestinationAutocomplete"
import { TravelDateRangePicker } from "@/features/trip/components/TravelDateRangePicker"
import { ActionDisabledHint } from "@/components/forms/ActionDisabledHint"
import { getTripSaveDisabledReason } from "@/features/trip/lib/actionability"
import { canRenderTripCover } from "@/features/trip/lib/cover"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { cn } from "@/lib/utils"

// Lazy-load the heavy Google Maps component (Loop 6: bundle optimization).
const TripMap = dynamic(
  () => import("@/features/map/components/TripMap").then((m) => ({ default: m.TripMap })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl bg-muted">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-muted-foreground" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
    ),
    ssr: false,
  }
)

type ViewMode = "list" | "map"

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { data: trip, isLoading, isError, error: _error } = useTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  // Cover photo auto-fetched from the destination's Google Places photo.
  const [editCover, setEditCover] = useState("")
  const tripSaveDisabledReason = getTripSaveDisabledReason({
    title: editTitle,
    startDate: editStartDate,
    endDate: editEndDate,
  })


  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 md:px-10 md:py-8 animate-fade-in-up">
        <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-2 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !trip) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <p className="text-sm text-destructive">
          Trip not found or you don&apos;t have access to it.
        </p>
        <BackLink href="/dashboard" variant="primary" />
      </div>
    )
  }

  const onDelete = () => {
    deleteTrip(id, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  const startEditing = () => {
    setEditTitle(trip.title)
    setEditDescription(trip.description ?? "")
    setEditStartDate(trip.start_date)
    setEditEndDate(trip.end_date)
    setEditCover(trip.cover_image_url ?? "")
    setIsEditing(true)
  }

  const saveEdits = () => {
    if (!editTitle.trim()) return
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


  const cancelEditing = () => setIsEditing(false)

  return (
    <main className="flex flex-col pb-4">
      {/* TripHero always visible — editing happens in BottomSheet */}
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

      {/* Phase 3B-2: Tab navigation for trip sub-sections */}
      <TripTabBar tripId={id} />

      {/* View mode toggle — always in same position */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile pt-6 md:px-margin-desktop">
        <div role="group" aria-label="View mode" className="mb-5 flex w-full gap-1 rounded-2xl border border-border/40 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              viewMode === "list"
                ? "bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              viewMode === "map"
                ? "bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            aria-pressed={viewMode === "map"}
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            Map
          </button>
        </div>
      </div>

      {/* Main content */}
      {viewMode === "map" ? (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile pb-6 md:px-margin-desktop md:pb-8">
          <div className="animate-fade-in-up">
            <TripMap days={trip.days} />
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile pb-6 md:px-margin-desktop md:pb-8">
          {trip.days.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/50 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <List className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No days yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Generate your itinerary to see daily plans here.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-fade-in-up">
              {trip.days.map((d, idx) => (
                <DayPanel
                  key={d.id}
                  tripId={id}
                  dayId={d.id}
                  dayNumber={d.day_number}
                  date={d.date}
                  notes={d.notes ?? ""}
                  destination={trip.description}
                  defaultExpanded={idx === 0}
                />
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Edit trip — BottomSheet (Loop 1: replaces inline edit) */}
      <BottomSheet open={isEditing} onClose={cancelEditing} title="Edit Trip">
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
            }}
            placeholder="Search city, province, or country"
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          {canRenderTripCover(editCover) && (
            <div className="relative h-28 w-full overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editCover} alt="Cover preview" className="h-full w-full object-cover" onError={() => setEditCover("")} />
              <button type="button" onClick={() => setEditCover("")} className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70">Remove</button>
            </div>
          )}
          <TravelDateRangePicker
            startDate={editStartDate}
            endDate={editEndDate}
            disabled={isUpdating}
            onChange={(range) => {
              setEditStartDate(range.startDate)
              setEditEndDate(range.endDate)
            }}
          />
          <ActionDisabledHint
            id="trip-save-disabled-reason"
            reason={tripSaveDisabledReason}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={saveEdits}
              disabled={isUpdating || Boolean(tripSaveDisabledReason)}
              aria-describedby={tripSaveDisabledReason ? "trip-save-disabled-reason" : undefined}
              className="flex-1"
            >
              <Check className="h-4 w-4" /> {isUpdating ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
    </main>
  )
}
