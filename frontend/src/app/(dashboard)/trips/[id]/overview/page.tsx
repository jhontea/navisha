"use client"

import { useParams } from "next/navigation"
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
} from "lucide-react"
import { useTrip } from "@/features/trip/hooks/useTrips"
import { useActivities } from "@/features/activity/hooks/useActivities"
import { activityApi } from "@/features/activity/api"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { useExpenseSummary, useExpenses } from "@/features/expense/hooks/useExpenses"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
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
      return "bg-transport-blue text-primary"
    case "note":
      return "bg-note-yellow text-tertiary"
    case "todo":
      return "bg-surface-container-highest text-on-surface-variant"
    default:
      return "bg-surface-container text-on-surface-variant"
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
    <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Recent Expenses</h4>
        <Link
          href={`/trips/${tripId}/budget`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      {expenses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          No expenses recorded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-lg bg-muted/40 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-transport-blue text-primary">
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
              <p className="shrink-0 text-sm font-medium text-foreground">
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
    <Link href={`/trips/${tripId}#day-${day.id}`}>
      <div
        className={cn(
          "group relative rounded-xl border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg",
          isToday
            ? "border-primary border-2 shadow-md"
            : "border-border/40 hover:border-primary/30"
        )}
      >
        {/* Today badge */}
        {isToday && (
          <div className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Today
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold text-foreground">
              Day {day.day_number}
            </h4>
            <p className="text-sm text-muted-foreground">
              {formatDate(day.date)}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {activityList.length} {activityList.length === 1 ? "activity" : "activities"}
          </span>
        </div>

        {/* Activity preview */}
        {previewActivities.length > 0 ? (
          <div className="mb-4 space-y-2">
            {previewActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded",
                    getActivityColor(activity.type)
                  )}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <span className="flex-1 truncate text-sm text-foreground">
                  {activity.title}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                +{remainingCount} more
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-dashed border-border/60 p-3 text-center">
            <p className="text-xs text-muted-foreground">No activities yet</p>
          </div>
        )}

        {/* View day button */}
        <button
          className={cn(
            "w-full rounded-lg py-2 text-sm font-medium transition-colors",
            isToday
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-primary text-primary hover:bg-primary/5"
          )}
        >
          View Day
        </button>
      </div>
    </Link>
  )
}

export default function TripOverviewPage() {
  const params = useParams<{ id: string }>()
  const tripId = params.id

  const { data: trip, isLoading } = useTrip(tripId)
  const { data: expenseSummary } = useExpenseSummary(tripId)
  const { data: accommodations } = useAccommodations(tripId)
  const { data: transportations } = useTransportations(tripId)

  // Aggregate total activities across every day of the trip.
  const dayIds = trip?.days.map((d) => d.id) ?? []
  const activityQueries = useQueries({
    queries: dayIds.map((dayId) => ({
      queryKey: ["activities", "list", dayId],
      queryFn: () => activityApi.list(dayId),
      enabled: !!dayId,
    })),
  })
  const totalActivities = activityQueries.reduce(
    (sum, q) => sum + (q.data?.items.length ?? 0),
    0,
  )
  const activitiesLoaded = activityQueries.every((q) => q.isSuccess)

  if (isLoading) {

    return (
      <div className="flex flex-col gap-4 px-4 py-6 md:px-10 md:py-8">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-8">
        <p className="text-sm text-destructive">Trip not found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const { currentDay, totalDays, percent: progressPercent, started } =
    getTripProgress(trip.start_date, trip.end_date)


  const totalSpent = expenseSummary?.total_base ?? 0
  const isOverBudget = !!trip.budget && trip.budget > 0 && totalSpent > trip.budget

  // Don't render every single day — surface the current day and the ones
  // coming up next (max 3). Full list lives on the Itinerary page.
  const today = getToday()
  const upcomingIdx = trip.days.findIndex((d) => d.date >= today)
  const startIdx = upcomingIdx === -1 ? Math.max(0, trip.days.length - 3) : upcomingIdx
  const visibleDays = trip.days.slice(startIdx, startIdx + 3)
  const hasMoreDays = trip.days.length > visibleDays.length



  return (
    <main className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 px-4 py-4 backdrop-blur-md md:px-10 md:py-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">

            Active Trip
          </span>
          <span className="text-xs text-muted-foreground md:text-sm">
            · {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
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
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>
        </div>
        {/* Hero Summary Section */}

        <section className="mb-8">
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-surface-container-low p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground md:text-2xl">
                  Trip Overview
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your complete journey at a glance
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration
                </p>
                <p className="text-2xl font-bold text-primary">
                  {totalDays} Days
                </p>
              </div>
            </div>

            {/* Bento Stat Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {/* Activities — total across all days */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-transport-blue">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Activities
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {activitiesLoaded ? totalActivities : "—"}
                </p>
              </div>

              {/* Stays — accommodation count */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stay-purple">
                    <Hotel className="h-4 w-4 text-on-secondary-fixed-variant" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stays
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {accommodations?.items.length ?? 0}
                </p>
              </div>

              {/* Transport — transportation count */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-transport-blue">
                    <Plane className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Transport
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {transportations?.items.length ?? 0}
                </p>
              </div>

              {/* Budget — total spent vs budget */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-budget-green">
                    <Wallet className="h-4 w-4 text-on-secondary-fixed" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Spent
                  </span>
                </div>
                <p
                  className={cn(
                    "truncate text-lg font-bold md:text-xl",
                    isOverBudget ? "text-destructive" : "text-foreground",
                  )}
                  title={
                    expenseSummary
                      ? formatCurrency(expenseSummary.total_base, expenseSummary.base_currency)
                      : undefined
                  }
                >
                  {expenseSummary
                    ? formatCurrency(expenseSummary.total_base, expenseSummary.base_currency)
                    : "—"}
                </p>
                {trip.budget && trip.budget > 0 && (
                  <p
                    className={cn(
                      "truncate text-xs",
                      isOverBudget ? "text-destructive" : "text-muted-foreground",
                    )}
                    title={`/ ${formatCurrency(trip.budget, trip.base_currency)}`}
                  >
                    / {formatCurrency(trip.budget, trip.base_currency)}
                  </p>
                )}

              </div>
            </div>

          </div>

          {/* Trip Progress */}
          <div className="mb-6 rounded-xl border border-border/40 bg-card p-5">
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

            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDate(trip.start_date)}</span>
              <span>{formatDate(trip.end_date)}</span>
            </div>
          </div>
        </section>

        {/* Daily Itinerary */}

        <section className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground md:text-2xl">
              Daily Itinerary
            </h3>
            <Link
              href={`/trips/${tripId}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All
              <ChevronRight className="h-4 w-4" />
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


        {/* Recent Expenses */}
        <section className="mb-8">
          <RecentExpenses tripId={tripId} />
        </section>
      </div>
    </main>
  )
}

