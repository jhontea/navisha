"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQueries } from "@tanstack/react-query"
import {
  Calendar,
  Hotel,
  Plane,
  Wallet,
  ChevronRight,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { BackLink } from "@/components/BackLink"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripEditForm } from "@/features/trip/components/TripEditForm"
import { getTripSaveDisabledReason } from "@/features/trip/lib/actionability"
import {
  useTrip,
  useDeleteTrip,
  useUpdateTrip,
} from "@/features/trip/hooks/useTrips"
import { getTripDateMetrics, toLocalISODate } from "@/features/trip/lib/status"
import { activityApi } from "@/features/activity/api"
import { useAccommodations } from "@/features/accommodation/hooks/useAccommodations"
import { useTransportations } from "@/features/transportation/hooks/useTransportations"
import { useExpenseSummary } from "@/features/expense/hooks/useExpenses"
import { TripSummaryCard } from "@/features/summary/components/TripSummaryCard"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"

import type { Day } from "@/features/trip/types"





// Helper to get today's date in YYYY-MM-DD format
function getToday(): string {
  return toLocalISODate()
}

type PlanningHealthProps = {
  tripId: string
  tripBudget: number
  baseCurrency: string
  actualSpent?: number
  hasActivities: boolean
  hasStay: boolean
  hasTransport: boolean
  hasDays: boolean
  budgetCategories: Record<string, number>
  actualByCategory: Array<{ category: string; total: number }>
}

function PlanningHealth({
  tripId,
  tripBudget,
  baseCurrency,
  actualSpent,
  hasActivities,
  hasStay,
  hasTransport,
  hasDays,
  budgetCategories,
  actualByCategory,
}: PlanningHealthProps) {
  const checklistItems = [
    { label: "Itinerary days added", done: hasDays, href: `/trips/${tripId}` },
    { label: "Activities planned", done: hasActivities, href: `/trips/${tripId}` },
    { label: "Accommodation arranged", done: hasStay, href: `/trips/${tripId}/stay` },
    { label: "Transport arranged", done: hasTransport, href: `/trips/${tripId}/transport` },
    { label: "Trip budget set", done: tripBudget > 0, href: `/trips/${tripId}/budget` },
  ]
  const completedItems = checklistItems.filter((item) => item.done).length
  const checklistPercent = Math.round((completedItems / checklistItems.length) * 100)
  const hasExpenseData = actualSpent !== undefined
  const remaining = tripBudget - (actualSpent ?? 0)
  const spentPercent = tripBudget > 0 && hasExpenseData
    ? Math.round((actualSpent! / tripBudget) * 100)
    : null
  const overBudget = remaining < 0
  const categoryRows = Object.entries(budgetCategories)
    .filter(([, planned]) => planned > 0)
    .map(([category, planned]) => ({
      category,
      planned,
      actual: actualByCategory.find((item) => item.category === category)?.total ?? 0,
    }))
  const overCategoryCount = categoryRows.filter((row) => row.actual > row.planned).length
  const categoryLabels: Record<string, string> = {
    accommodation: "Accommodation",
    transport: "Transport",
    food: "Food",
    activity: "Activity",
    souvenir: "Souvenir",
    shopping: "Shopping",
    other: "Other",
  }

  return (
    <section className="mb-8" aria-labelledby="trip-health-heading">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Planning health</p>
          <h3 id="trip-health-heading" className="mt-1 text-lg font-bold text-foreground">
            Trip planning health
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">{completedItems} of {checklistItems.length} ready</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Trip readiness</h4>
                <p className="text-xs text-muted-foreground">Core trip setup</p>
              </div>
            </div>
            <span className="text-lg font-bold tabular-nums text-foreground">{checklistPercent}%</span>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" aria-label={`${checklistPercent}% of planning checklist complete`}>
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-chromatic-ocean transition-all" style={{ width: `${checklistPercent}%` }} />
          </div>

          <div className="space-y-2">
            {checklistItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-chromatic-mint" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-chromatic-amber" aria-hidden="true" />
                )}
                <span className={cn(item.done ? "text-muted-foreground" : "font-medium text-foreground")}>
                  {item.label}
                </span>
                {!item.done && <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chromatic-sunset/10 text-chromatic-sunset">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Planned vs actual budget</h4>
                <p className="text-xs text-muted-foreground">{baseCurrency} trip health</p>
              </div>
            </div>
            {spentPercent !== null && (
              <span className={cn("text-lg font-bold tabular-nums", overBudget ? "text-destructive" : "text-foreground")}>
                {spentPercent}%
              </span>
            )}
          </div>

          {tripBudget > 0 ? (
            <>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" aria-label={spentPercent === null ? "Budget usage unavailable" : `${spentPercent}% of budget used`}>
                <div
                  className={cn("h-full rounded-full transition-all", overBudget ? "bg-destructive" : "bg-chromatic-mint")}
                  style={{ width: `${Math.min(spentPercent ?? 0, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Planned</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">{formatCurrency(tripBudget, baseCurrency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actual</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {hasExpenseData ? formatCurrency(actualSpent!, baseCurrency) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{overBudget ? "Over" : "Remaining"}</p>
                  <p className={cn("mt-1 font-semibold tabular-nums", overBudget ? "text-destructive" : "text-chromatic-mint")}>
                    {hasExpenseData ? formatCurrency(Math.abs(remaining), baseCurrency) : "—"}
                  </p>
                </div>
              </div>
              {categoryRows.length > 0 && (
                <div className="mt-5 border-t border-border/40 pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">Category variance</p>
                    {overCategoryCount > 0 && <p className="text-xs font-medium text-destructive">{overCategoryCount} over plan</p>}
                  </div>
                  <div className="space-y-2">
                    {categoryRows.slice(0, 4).map((row) => {
                      const over = row.actual > row.planned
                      return (
                        <div key={row.category} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{categoryLabels[row.category] ?? row.category}</span>
                          <span className={cn("tabular-nums", over ? "text-destructive" : "text-foreground")}>
                            {formatCurrency(row.actual, baseCurrency)} / {formatCurrency(row.planned, baseCurrency)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link href={`/trips/${tripId}/budget`} className="flex items-center justify-between rounded-xl border border-dashed border-border/60 p-4 text-sm hover:bg-muted/50">
              <span className="text-muted-foreground">Set a trip budget to track variance.</span>
              <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
          )}

          <Link href={`/trips/${tripId}/budget`} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View budget details
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function NeedsAttention({
  tripId,
  hasActivities,
  hasStay,
  hasTransport,
  hasBudget,
  overBudget,
  emptyDayCount,
  overCategoryCount,
}: {
  tripId: string
  hasActivities: boolean
  hasStay: boolean
  hasTransport: boolean
  hasBudget: boolean
  overBudget: boolean
  emptyDayCount: number
  overCategoryCount: number
}) {
  const items = [
    !hasActivities && { label: "Add activities to your itinerary", href: `/trips/${tripId}` },
    !hasStay && { label: "Arrange accommodation", href: `/trips/${tripId}/stay` },
    !hasTransport && { label: "Add transport details", href: `/trips/${tripId}/transport` },
    !hasBudget && { label: "Set a trip budget", href: `/trips/${tripId}/budget` },
    overBudget && { label: "Review the budget overrun", href: `/trips/${tripId}/budget` },
    emptyDayCount > 0 && { label: `${emptyDayCount} itinerary day${emptyDayCount === 1 ? "" : "s"} need activities`, href: `/trips/${tripId}` },
    overCategoryCount > 0 && { label: `${overCategoryCount} budget categor${overCategoryCount === 1 ? "y is" : "ies are"} over plan`, href: `/trips/${tripId}/budget` },
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <section className="mb-8" aria-labelledby="needs-attention-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chromatic-amber">Next actions</p>
          <h3 id="needs-attention-heading" className="mt-1 text-lg font-bold text-foreground">Needs attention</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-chromatic-mint/25 bg-chromatic-mint/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-chromatic-mint" aria-hidden="true" />
          Everything looks good for now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {items.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl border border-chromatic-amber/20 bg-chromatic-amber/5 px-4 py-3 text-sm transition-colors hover:bg-chromatic-amber/10">
              <AlertTriangle className="h-4 w-4 shrink-0 text-chromatic-amber" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function NextUp({ tripId, day, activityCount }: { tripId: string; day?: Day; activityCount: number }) {
  return (
    <section className="mb-8" aria-labelledby="next-up-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id="next-up-heading" className="text-lg font-bold text-foreground">Next up</h3>
        <Link href={`/trips/${tripId}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View itinerary <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      {day ? (
        <Link href={`/trips/${tripId}#day-${day.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:bg-primary/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Day {day.day_number} · {formatDate(day.date)}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{day.title || "Continue planning this day"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activityCount} {activityCount === 1 ? "activity" : "activities"} planned</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">No upcoming itinerary yet.</div>
      )}
    </section>
  )
}

export default function TripOverviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const tripId = params.id

  const {
    data: trip,
    isLoading,
    isError: isTripError,
    error: tripError,
    refetch: refetchTrip,
    isFetching: isFetchingTrip,
  } = useTrip(tripId)
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
  const tripSaveDisabledReason = getTripSaveDisabledReason({
    title: editTitle,
    startDate: editStartDate,
    endDate: editEndDate,
  })



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
    const isNotFound = tripError instanceof ApiError && tripError.status === 404

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
            {!isNotFound && isTripError && (
              <Button
                type="button"
                variant="gradient"
                className="rounded-full px-5"
                disabled={isFetchingTrip}
                aria-busy={isFetchingTrip}
                onClick={() => void refetchTrip()}
              >
                <RefreshCw className={cn("h-4 w-4", isFetchingTrip && "animate-spin")} aria-hidden="true" />
                {isFetchingTrip ? "Trying again…" : "Try again"}
              </Button>
            )}
            <BackLink href="/trips" label="Back to My Trips" variant="glass" />
          </div>
        </div>
      </div>
    )
  }

  const { currentDay, totalDays, percent: progressPercent, started } =
    getTripDateMetrics(trip.start_date, trip.end_date)


  // Don't render every single day — surface the current day and the ones
  // coming up next (max 3). Full list lives on the Itinerary page.
  const today = getToday()
  const upcomingIdx = trip.days.findIndex((d) => d.date >= today)
  const startIdx = upcomingIdx === -1 ? Math.max(0, trip.days.length - 3) : upcomingIdx
  const nextUpDay = trip.days[startIdx]
  const nextUpDayIndex = nextUpDay ? trip.days.findIndex((day) => day.id === nextUpDay.id) : -1
  const nextUpActivityCount = nextUpDayIndex >= 0 ? activityQueries[nextUpDayIndex]?.data?.items.length ?? 0 : 0
  const emptyDayCount = activityQueries.filter((query) => query.isSuccess && (query.data?.items.length ?? 0) === 0).length
  const overCategoryCount = Object.entries(trip.budget_categories ?? {}).filter(([category, planned]) => {
    const actual = expenseSummary?.by_category.find((item) => item.category === category)?.total ?? 0
    return planned > 0 && actual > planned
  }).length

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
          onCancel={cancelEditing}
        />
      ) : (
        /* Display mode: full-bleed TripHero */
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

      {/* Phase 3B: Trip section tab navigation */}
      <TripTabBar tripId={tripId} />

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">

        {isTripError && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-chromatic-amber/30 bg-chromatic-amber/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chromatic-amber" aria-hidden="true" />
              <p className="text-foreground">
                Showing the last loaded trip data. Some recent changes may not be visible yet.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start rounded-full px-3 sm:self-auto"
              disabled={isFetchingTrip}
              aria-busy={isFetchingTrip}
              onClick={() => void refetchTrip()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetchingTrip && "animate-spin")} aria-hidden="true" />
              {isFetchingTrip ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        )}

        {/* Iter 93 — Hero summary section: bento grid on md+ */}
        <section className="mb-8 animate-fade-in">
          {/* Iter 94 — stat chips: 2x2 grid on sm, row on md */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Activities */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-primary/10 border border-primary/15 p-4 text-center">
              <Calendar className="mb-1.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {activitiesLoaded ? totalActivities : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Activities</span>
            </div>
            {/* Stays */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-chromatic-aurora/10 border border-chromatic-aurora/15 p-4 text-center">
              <Hotel className="mb-1.5 h-5 w-5 text-chromatic-aurora" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {accommodations?.items.length ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Stays</span>
            </div>
            {/* Transport */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-chromatic-ocean/10 border border-chromatic-ocean/15 p-4 text-center">
              <Plane className="mb-1.5 h-5 w-5 text-chromatic-ocean" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                {transportations?.items.length ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Transport</span>
            </div>
            {/* Spent */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-chromatic-sunset/10 border border-chromatic-sunset/20 p-4 text-center">
              <Wallet className="mb-1.5 h-5 w-5 text-chromatic-sunset" aria-hidden="true" />
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

          <PlanningHealth
            tripId={tripId}
            tripBudget={trip.budget}
            baseCurrency={trip.base_currency}
            actualSpent={expenseSummary?.total_base}
            budgetCategories={trip.budget_categories ?? {}}
            actualByCategory={expenseSummary?.by_category ?? []}
            hasActivities={totalActivities > 0}
            hasStay={(accommodations?.items.length ?? 0) > 0}
            hasTransport={(transportations?.items.length ?? 0) > 0}
            hasDays={trip.days.length > 0}
          />

          {/* Iter 95 — Trip progress bar */}
          <div className="glass mb-6 rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">
                Trip Progress
              </h4>
              <span className="shrink-0 text-right text-sm text-muted-foreground">
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
        <section className="mb-10">
          <TripSummaryCard tripId={tripId} />
        </section>

        <NeedsAttention
          tripId={tripId}
          hasActivities={totalActivities > 0}
          hasStay={(accommodations?.items.length ?? 0) > 0}
          hasTransport={(transportations?.items.length ?? 0) > 0}
          hasBudget={trip.budget > 0}
          overBudget={trip.budget > 0 && (expenseSummary?.total_base ?? 0) > trip.budget}
          emptyDayCount={emptyDayCount}
          overCategoryCount={overCategoryCount}
        />

        <NextUp tripId={tripId} day={nextUpDay} activityCount={nextUpActivityCount} />

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


