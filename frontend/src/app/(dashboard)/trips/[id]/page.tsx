"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Check,
  List,
  Map,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { formatDateRange } from "@/lib/utils"
import { useTrip, useDeleteTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { DayPanel } from "@/features/activity/components/DayPanel"
import { TripMap } from "@/features/map/components/TripMap"
import { cn } from "@/lib/utils"

// Currency display names
const CURRENCY_NAMES: Record<string, string> = {
  IDR: "Indonesian Rupiah",
  USD: "US Dollar",
  JPY: "Japanese Yen",
  SGD: "Singapore Dollar",
  KRW: "South Korean Won",
  EUR: "Euro",
  GBP: "British Pound",
  AUD: "Australian Dollar",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  CNY: "Chinese Yuan",
}

function getCurrencyDisplay(code: string) {
  const name = CURRENCY_NAMES[code]
  return name ? `${code} \u2014 ${name}` : code
}

type ViewMode = "list" | "map"

export default function TripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const { data: trip, isLoading, isError, error } = useTrip(id)
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 md:px-10 md:py-8">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !trip) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <p className="text-sm text-destructive">
          {error?.message ?? "Trip not found"}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          ← Back to dashboard
        </Link>
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
        cover_image_url: trip.cover_image_url,
        notes: trip.notes,
      },
      { onSettled: () => setIsEditing(false) },
    )
  }

  const cancelEditing = () => setIsEditing(false)

  return (
    <main className="flex flex-col">
      {/* Trip Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 px-4 py-4 backdrop-blur-md md:px-10 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

          {/* Left: trip info / inline edit */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              /* Inline edit form */
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Editing
                  </span>
                </div>
                {/* Title */}
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEditing()
                  }}
                  placeholder="Trip title"
                  className="w-full rounded-lg border border-primary bg-background px-3 py-1.5 text-xl font-bold tracking-tight text-foreground focus:outline-none md:text-2xl"
                  disabled={isUpdating}
                />
                {/* Location / description */}
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Location / description (optional)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  disabled={isUpdating}
                />
                {/* Dates */}
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      End date
                    </label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      disabled={isUpdating}
                    />
                  </div>
                </div>
                {/* Save / Cancel */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveEdits}
                    disabled={isUpdating || !editTitle.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isUpdating ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Active Trip
                  </span>
                  <span className="text-xs text-muted-foreground md:text-sm">
                    · {formatDateRange(trip.start_date, trip.end_date)}
                  </span>
                </div>
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-3xl">
                  {trip.title}
                </h1>
                {trip.description && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {trip.description}
                  </p>
                )}
                {trip.base_currency && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getCurrencyDisplay(trip.base_currency)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Right: actions */}
          {!isEditing && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={startEditing}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:border-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {isDeleting ? "Deleting…" : "Delete"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        {/* Top bar: back + view toggle */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>

          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                viewMode === "map"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Map view"
            >
              <Map className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>
        {viewMode === "list" ? (
          trip.days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No days generated for this trip.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {trip.days.map((d, idx) => (
                <DayPanel
                  key={d.id}
                  tripId={id}
                  dayId={d.id}
                  dayNumber={d.day_number}
                  date={d.date}
                  notes={d.notes ?? ""}
                  defaultExpanded={idx === 0}
                />
              ))}
            </div>
          )
        ) : (
          <TripMap days={trip.days} />
        )}
      </div>

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
