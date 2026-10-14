"use client"

import Link from "next/link"
import { Calendar, ChevronRight, Hotel, Plane, Wallet } from "lucide-react"

import { MoneyText } from "@/components/MoneyText"
import { StatTile } from "@/components/StatTile"
import { Progress } from "@/components/ui/progress"
import { overviewTodos } from "@/features/trip/lib/overviewTodos"
import { getTripDateMetrics, toLocalISODate, tripProgressLabel } from "@/features/trip/lib/status"
import { useTripOverview } from "@/features/trip/overview"
import { formatDate } from "@/lib/utils"

import { BudgetSnapshot } from "./overview/BudgetSnapshot"
import { TodoList } from "./overview/TodoList"

/**
 * Trip overview: headline counts, trip progress, what is still missing, the
 * next day to plan and a budget snapshot. Shown as a collapsible panel above
 * the Itinerary; details live on the Bookings and Budget tabs.
 */
export function TripOverview({ tripId }: { tripId: string }) {
  const { data: overview, isSuccess: countsLoaded } = useTripOverview(tripId)
  const trip = overview?.trip
  if (!trip) return null

  const summary = overview.expense_summary
  const activitiesByDay = overview.activity_count_by_day ?? {}
  const activityCount = Object.values(activitiesByDay).reduce((sum, count) => sum + count, 0)
  const dateMetrics = getTripDateMetrics(trip.start_date, trip.end_date)

  // The day to plan next: today or the first day after it, else the last day.
  const today = toLocalISODate()
  const upcomingIdx = trip.days.findIndex((d) => d.date >= today)
  const nextDay = trip.days[upcomingIdx === -1 ? trip.days.length - 1 : upcomingIdx]
  const nextDayActivities = nextDay ? activitiesByDay[nextDay.id] ?? 0 : 0

  const categories = Object.entries(trip.budget_categories ?? {})
    .filter(([, planned]) => planned > 0)
    .map(([category, planned]) => ({
      category,
      planned,
      actual: summary?.by_category.find((item) => item.category === category)?.total ?? 0,
    }))

  const todos = overviewTodos({
    tripId,
    activityCount,
    stayCount: overview.accommodation_count,
    transportCount: overview.transportation_count,
    budget: trip.budget,
    spent: summary?.total_base ?? 0,
    emptyDayCount: countsLoaded
      ? trip.days.filter((day) => (activitiesByDay[day.id] ?? 0) === 0).length
      : null,
    overCategoryCount: categories.filter((c) => c.actual > c.planned).length,
  })

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Activities" icon={Calendar} value={countsLoaded ? activityCount : "—"} />
        <StatTile label="Stays" icon={Hotel} value={overview.accommodation_count} />
        <StatTile label="Transport" icon={Plane} value={overview.transportation_count} />
        <StatTile
          label="Spent"
          icon={Wallet}
          value={summary ? <MoneyText amount={summary.total_base} currency={summary.base_currency} className="text-lg" /> : "—"}
        />
      </div>

      <section aria-labelledby="overview-progress-heading">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 id="overview-progress-heading" className="text-sm font-semibold text-foreground">
            {dateMetrics.totalDays} {dateMetrics.totalDays === 1 ? "day" : "days"}
          </h3>
          <span className="text-sm text-muted-foreground">{tripProgressLabel(dateMetrics)}</span>
        </div>
        <Progress value={dateMetrics.percent} size="sm" label="Trip progress" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{formatDate(trip.start_date)}</span>
          <span>{formatDate(trip.end_date)}</span>
        </div>
      </section>

      <TodoList todos={todos} />

      {nextDay && (
        <Link
          href={`/trips/${tripId}#day-${nextDay.id}`}
          className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Next up · Day {nextDay.day_number} · {formatDate(nextDay.date)}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {nextDay.title || "Continue planning this day"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {nextDayActivities} {nextDayActivities === 1 ? "activity" : "activities"} planned
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      )}

      <BudgetSnapshot
        tripId={tripId}
        budget={trip.budget}
        currency={trip.base_currency}
        spent={summary?.total_base}
      />
    </div>
  )
}
