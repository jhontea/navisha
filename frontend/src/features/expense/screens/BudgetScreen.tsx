"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"

import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { BudgetForm, type BudgetFormValues } from "@/features/expense/components/BudgetForm"
import { BudgetSummary } from "@/features/expense/components/BudgetSummary"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"

export function BudgetScreen() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)
  const [editingBudget, setEditingBudget] = useState(false)

  const saveBudget = ({ budget, budgetCategories }: BudgetFormValues) => {
    if (!trip) return
    updateTrip(
      {
        title: trip.title,
        description: trip.description,
        start_date: trip.start_date,
        end_date: trip.end_date,
        base_currency: trip.base_currency,
        budget,
        budget_categories: budgetCategories,
        cover_image_url: trip.cover_image_url,
        notes: trip.notes,
      },
      {
        onSuccess: () => {
          setEditingBudget(false)
          toast("Budget updated.")
        },
        onError: (error) => {
          const message =
            error instanceof ApiError && error.status >= 400 && error.status < 500
              ? error.message
              : "Couldn’t save your budget. Please check your connection and try again."
          toast(message, "error")
        },
      },
    )
  }

  if (isLoading || !trip) {
    return (
      <div className="mx-auto grid w-full max-w-max-width gap-6 px-margin-mobile py-6 md:px-margin-desktop lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const hasBudget = trip.budget > 0

  return (
    <main className="mx-auto grid w-full max-w-max-width grid-cols-[minmax(0,1fr)] items-start gap-6 px-margin-mobile pb-6 pt-4 md:px-margin-desktop md:pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Summary and charts on the left, expenses on the right. */}
      <div className="space-y-3">
        <BudgetSummary
          tripId={id}
          budget={trip.budget}
          budgetCategories={trip.budget_categories}
          days={trip.days}
          onEditBudget={() => setEditingBudget(true)}
        />
        <Link
          href="/currency"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-primary-soft-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          Currency converter
        </Link>
      </div>

      <ExpenseSection tripId={id} tripBaseCurrency={trip.base_currency} tripStartDate={trip.start_date} tripEndDate={trip.end_date} />

      <ResponsiveSheet
        open={editingBudget}
        onOpenChange={(open) => !open && !isUpdating && setEditingBudget(false)}
        title={hasBudget ? "Edit budget" : "Set budget"}
        description={`Amounts are in ${trip.base_currency}, the trip's base currency.`}
      >
        {editingBudget && (
          <BudgetForm
            currency={trip.base_currency}
            initialBudget={trip.budget}
            initialCategories={trip.budget_categories}
            isSubmitting={isUpdating}
            onCancel={() => setEditingBudget(false)}
            onSubmit={saveBudget}
          />
        )}
      </ResponsiveSheet>
    </main>
  )
}
