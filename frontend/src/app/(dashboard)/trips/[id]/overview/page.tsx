"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQueries } from "@tanstack/react-query"
import {
  Calendar,
  MapPin,
  Hotel,
  Plane,
  Wallet,
  Clock,
  ChevronRight,
  Check,
  X,
} from "lucide-react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { BackLink } from "@/components/BackLink"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { TripHero } from "@/features/trip/components/TripHero"
import {
  useTrip,
  useDeleteTrip,
  useUpdateTrip,
} from "@/features/trip/hooks/useTrips"
import { DestinationAutocomplete } from "@/features/trip/components/DestinationAutocomplete"
import { useActivities } from "@/features/activity/hooks/useActivities"

import { activityApi } from "@/features/activity/api"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { useExpenseSummary, useExpenses } from "@/features/expense/hooks/useExpenses"
import { TripSummaryCard } from "@/features/summary/components/TripSummaryCard"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

import type { Day } from "@/features/trip/types"
import type { Expense } from "@/features/expense/types"





// Helper to get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0]
}

// Calculate days between two dates
function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// Determine trip progress relative to today.
// - Before the trip starts: day 0, 0% progress (not started)
// - During the trip: the day currently in progress
// - After the trip ends: clamped to the last day / 100%
function getTripProgress(startDate: string, endDate: string) {
  const today = new Date(getToday())
  const start = new Date(startDate)
  const totalDays = daysBetween(startDate, endDate)
  const diffDays = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays < 0) {
    // Trip hasn't started yet
    return { currentDay: 0, totalDays, percent: 0, started: false }
  }

  const currentDay = Math.min(diffDays + 1, totalDays)
  const percent = Math.min(100, (currentDay / totalDays) * 100)
  return { currentDay, totalDays, percent, started: true }
}


// Activity type icon mapping
function getActivityIcon(type: string) {
  switch (type) {
    case "location":
      return <MapPin className="h-3.5 w-3.5" />
    case "note":
      return <Clock className="h-3.5 w-3.5" />
    case "todo":
      return <Calendar className="h-3.5 w-3.5" />
    default:
      return <MapPin className="h-3.5 w-3.5" />
  }
}

// Activity type color mapping
function getActivityColor(type: string): string {
  switch (type) {
    case "location":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "note":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "todo":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// Expense category icon mapping
function getExpenseIcon(category: string) {
  switch (category) {
    case "accommodation":
      return <Hotel className="h-4 w-4" />
    case "transport":
      return <Plane className="h-4 w-4" />
    case "food":
      return <Wallet className="h-4 w-4" />
    default:
      return <Wallet className="h-4 w-4" />
  }
}

// Recent expenses list
function RecentExpenses({ tripId }: { tripId: string }) {
  const { data } = useExpenses(tripId)
  const expenses: Expense[] = (data?.items ?? [])
    .slice()
    .sort((a, b) => (b.expense_date > a.expense_date ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Recent Expenses</h4>
        <Link
          href={`/trips/${tripId}/budget`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          View All
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      {expenses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 p-5 text-center text-xs text-muted-foreground">
          No expenses recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-xl bg-white/40 border border-white/30 px-3 py-2.5 hover:bg-white/60 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {getExpenseIcon(expense.category)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {expense.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.expense_date)}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(expense.converted_amount, expense.base_currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Day card component with activity preview
function DayCard({ day, tripId }: { day: Day; tripId: string }) {
  const { data: activities } = useActivities(day.id)
  const isToday = day.date === getToday()
  const activityList = activities?.items ?? []
  const previewActivities = activityList.slice(0, 3)
  const remainingCount = Math.max(0, activityList.length - 3)

  return (
    <Link href={`/trips/${tripId}#day-${day.id}`} aria-label={`View Day ${day.day_number} — ${formatDate(day.date)}`}>
      <div
        className={cn(
          "group relative rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] cursor-pointer",
          isToday
            ? "border-primary/60 border-2 shadow-md ring-2 ring-primary/10"
            : "border-border/40 hover:border-primary/30"
        )}
      >
        {/* Today badge */}
        {isToday && (
          <div className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            Today
          </div>
        )}

        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h4 className="text-base font-bold text-foreground">
              Day {day.day_number}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(day.date)}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary border border-primary/15">
            {activityList.length} {activityList.length === 1 ? "activity" : "activities"}
          </span>
        </div>

        {/* Activity preview */}
        {previewActivities.length > 0 ? (
          <div className="mb-4 space-y-1.5">
            {previewActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                    getActivityColor(activity.type)
                  )}
                  aria-hidden="true"
                >
                  {getActivityIcon(activity.type)}
                </div>
                <span className="flex-1 truncate text-xs text-foreground">
                  {activity.title}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="text-[11px] text-muted-foreground pl-7">
                +{remainingCount} more
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-border/50 py-3 text-center">
            <p className="text-xs text-muted-foreground">No activities yet</p>
          </div>
        )}

        {/* View day CTA */}
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 w-full rounded-xl py-2 text-xs font-semibold transition-colors",
            isToday
              ? "bg-primary text-primary-foreground"
              : "border border-primary/40 text-primary group-hover:bg-primary/5"
          )}
          aria-hidden="true"
        >
          View Day
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

export default function TripOverviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const tripId = params.id

  const { data: trip, isLoading } = useTrip(tripId)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(tripId)
  const { data: expenseSummary } = useExpenseSummary(tripId)
  const { data: accommodations } = useAccommodations(tripId)
  const { data: transportations } = useTransportations(tripId)

  // Delete confirmation + inline edit state (mirrors the Itinerary header)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  // Cover photo auto-fetched from the destination's Google Places photo.
  const [editCover, setEditCover] = useState("")



  // ── Aggregate activity queries per day ──
  // CRITICAL: useMemo on both dayIds AND queries array — prevents
  // useQueries from re-creating queryFn on every render which causes
  // internal TanStack Query churn and excessive backend calls.
  // See: /memories/navisha-frontend-patterns.md
  const dayIds = useMemo(() => trip?.days.map((d) => d.id) ?? [], [trip?.days])
  const activityQueries = useQueries({
    queries: useMemo(
      () =>
        dayIds.map((dayId) => ({
          queryKey: ["activities", "list", dayId] as const,
          queryFn: () => activityApi.list(dayId),
          enabled: !!dayId,
          staleTime: 5 * 60 * 1000,
        })),
      [dayIds],
    ),
  })
  const totalActivities = activityQueries.reduce(
    (sum, q) => sum + (q.data?.items.length ?? 0),
    0,
  )
  const activitiesLoaded = activityQueries.every((q) => q.isSuccess)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 md:px-10 md:py-8 animate-fade-in">
        <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <p className="text-sm text-destructive">Trip not found</p>
        <BackLink href="/dashboard" variant="primary" />
      </div>
    )
  }

  const { currentDay, totalDays, percent: progressPercent, started } =
    getTripProgress(trip.start_date, trip.end_date)


  // Don't render every single day — surface the current day and the ones
  // coming up next (max 3). Full list lives on the Itinerary page.
  const today = getToday()
  const upcomingIdx = trip.days.findIndex((d) => d.date >= today)
  const startIdx = upcomingIdx === -1 ? Math.max(0, trip.days.length - 3) : upcomingIdx
  const visibleDays = trip.days.slice(startIdx, startIdx + 3)
  const hasMoreDays = trip.days.length > visibleDays.length

  const onDelete = () => {
    deleteTrip(tripId, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  const startEditing = () => {
    setEditTitle(trip.title)
    setEditDescription(trip.description ?? "")
    setEditCover(trip.cover_image_url ?? "")
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
        budget: trip.budget,
        cover_image_url: editCover,
        notes: trip.notes,

      },
      { onSettled: () => setIsEditing(false) },
    )
  }

  const cancelEditing = () => setIsEditing(false)

  return (
    <main className="flex flex-col">
      {/* TripHero with cover image — replaced sticky admin header (Phase 3B-2) */}
      {isEditing ? (
        /* Inline edit form when editing */
        <div className="border-b bg-background px-4 py-4 md:px-10 md:py-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                Editing
              </span>
            </div>
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
            <DestinationAutocomplete
              value={editDescription}
              onChange={setEditDescription}
              onSelect={(place) => {
                setEditDescription(place.description)
                setEditCover(place.photoUrl || "")
              }}
              placeholder="Search city, province, or country"
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {editCover && (
              <div className="relative h-28 w-full overflow-hidden rounded-lg border border-input">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editCover}
                  alt="Trip cover preview"
                  className="h-full w-full object-cover"
                  onError={() => setEditCover("")}
                />
                <button
                  type="button"
                  onClick={() => setEditCover("")}
                  className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white hover:bg-black/70"
                >
                  Remove
                </button>
              </div>
            )}
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
        </div>
      ) : (
        /* Display mode: full-bleed TripHero */
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

      {/* Phase 3B: Trip section tab navigation */}
      <TripTabBar tripId={tripId} />

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        <div className="mb-4">
          <BackLink href="/dashboard" />
        </div>

        {/* Iter 93 — Hero summary section: bento grid on md+ */}
        <section className="mb-8 animate-fade-in">
          {/* Iter 94 — stat chips: 2x2 grid on sm, row on md */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Activities */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/15 p-4 text-center">
              <Calendar className="mb-1.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {activitiesLoaded ? totalActivities : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Activities</span>
            </div>
            {/* Stays */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/15 p-4 text-center">
              <Hotel className="mb-1.5 h-5 w-5 text-violet-500" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {accommodations?.items.length ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Stays</span>
            </div>
            {/* Transport */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/15 p-4 text-center">
              <Plane className="mb-1.5 h-5 w-5 text-sky-500" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {transportations?.items.length ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Transport</span>
            </div>
            {/* Spent */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4 text-center">
              <Wallet className="mb-1.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="text-base font-bold text-foreground tabular-nums leading-tight">
                {expenseSummary
                  ? formatCurrency(expenseSummary.total_base, expenseSummary.base_currency)
                  : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Spent</span>
            </div>
          </div>

          {/* Duration badge */}
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-semibold text-primary">
              {totalDays} {totalDays === 1 ? "day" : "days"}
            </span>
            <span className="text-sm text-muted-foreground">
              {started
                ? `Day ${currentDay} of ${totalDays} · in progress`
                : new Date(trip.start_date) > new Date()
                ? "Upcoming"
                : "Completed"}
            </span>
          </div>

          <div>
          </div>

          {/* Iter 95 — Trip progress bar */}
          <div className="glass mb-6 rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Trip Progress
              </h4>
              <span className="text-sm text-muted-foreground">
                {started
                  ? `Day ${currentDay} of ${totalDays}`
                  : "Not started yet"}
              </span>
            </div>
            <Progress
              value={progressPercent}
              variant="gradient"
              size="lg"
              showValue
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDate(trip.start_date)}</span>
              <span>{formatDate(trip.end_date)}</span>
            </div>
          </div>
        </section>

        {/* Iter 96 — AI Trip Summary */}
        <section className="mb-8">
          <TripSummaryCard tripId={tripId} />
        </section>

        {/* Daily Itinerary */}

        {/* Iter 97 — Daily Itinerary section header */}
        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              Daily Itinerary
            </h3>
            <Link
              href={`/trips/${tripId}`}
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              View All
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {trip.days.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No days added yet. Start planning your trip!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleDays.map((day) => (
                  <DayCard key={day.id} day={day} tripId={tripId} />
                ))}
              </div>
              {hasMoreDays && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/trips/${tripId}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    View all {trip.days.length} days
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </section>


        {/* Iter 98 — Recent Expenses */}
        <section className="mb-10">
          <RecentExpenses tripId={tripId} />
        </section>
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


