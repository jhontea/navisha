"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

import { ActionDisabledHint } from "@/components/forms/ActionDisabledHint"
import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { getBudgetSaveDisabledReason } from "@/features/trip/lib/actionability"

const BUDGET_CATEGORIES = [
  ["transport", "Transport"],
  ["accommodation", "Accommodation"],
  ["activity", "Activity"],
  ["food", "Food"],
  ["souvenir", "Souvenir"],
  ["shopping", "Shopping"],
  ["other", "Other"],
] as const

export default function TripBudgetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)

  const [editingBudget, setEditingBudget] = useState(false)
  const [displayBudget, setDisplayBudget] = useState("")
  const [rawBudget, setRawBudget] = useState("")
  const [categoryBudgetDraft, setCategoryBudgetDraft] = useState<Record<string, string>>({})
  const budgetSaveDisabledReason = getBudgetSaveDisabledReason(rawBudget)
  const categoryBudgetTotal = Object.values(categoryBudgetDraft).reduce((sum, value) => {
    const amount = Number(value.replace(/,/g, ""))
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)
  const draftTotalBudget = Number(rawBudget)
  const categoryBudgetError = draftTotalBudget > 0 && categoryBudgetTotal > draftTotalBudget
    ? "Category allocations cannot exceed the total budget."
    : null

  const handleSaveBudget = async () => {
    if (!trip) return
    const budget = Number(rawBudget)
    if (isNaN(budget) || budget < 0) return
    const budgetCategories: Record<string, number> = {}
    Object.entries(categoryBudgetDraft).forEach(([category, value]) => {
      const amount = Number(value.replace(/,/g, ""))
      if (Number.isFinite(amount) && amount > 0) budgetCategories[category] = amount
    })
    updateTrip({
      title: trip.title,
      description: trip.description,
      start_date: trip.start_date,
      end_date: trip.end_date,
      base_currency: trip.base_currency,
      budget,
      budget_categories: budgetCategories,
      cover_image_url: trip.cover_image_url,
      notes: trip.notes,
    })
    setEditingBudget(false)
    setDisplayBudget("")
    setRawBudget("")
  }

  const openEditBudget = () => {
    const initial = trip?.budget ? String(trip.budget) : ""
    setRawBudget(initial)
    setDisplayBudget(initial ? Number(initial).toLocaleString() : "")
    setCategoryBudgetDraft(
      Object.fromEntries(
        BUDGET_CATEGORIES.map(([category]) => [category, trip?.budget_categories?.[category] ? String(trip.budget_categories[category]) : ""]),
      ),
    )
    setEditingBudget(true)
  }

  return (
    <main className="flex flex-col pb-4">
      {isLoading && !trip ? (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 space-y-10 animate-fade-in">
          <div>
            <div className="h-6 w-40 rounded bg-muted animate-pulse mb-4" />
            <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
          </div>
          <div>
            <div className="h-6 w-36 rounded bg-muted animate-pulse mb-4" />
            <div className="rounded-xl glass p-8 animate-pulse">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-muted" />
              <div className="mx-auto mt-4 h-4 w-32 rounded bg-muted" />
            </div>
          </div>
          <div>
            <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in">
        {editingBudget && (
          <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-sm animate-scale-in" role="dialog" aria-label="Edit budget">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  {trip?.budget && trip.budget > 0 ? "Edit Budget" : "Set Budget"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Budget in {trip?.base_currency ?? "IDR"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingBudget(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Cancel editing budget"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="block font-medium text-muted-foreground text-sm">Planned by category</label>
                  <span className={categoryBudgetError ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                    {categoryBudgetTotal.toLocaleString()} / {draftTotalBudget > 0 ? draftTotalBudget.toLocaleString() : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {BUDGET_CATEGORIES.map(([category, label]) => (
                    <label key={category} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={categoryBudgetDraft[category] ?? ""}
                        onChange={(e) => setCategoryBudgetDraft((current) => ({
                          ...current,
                          [category]: e.target.value.replace(/[^0-9.]/g, ""),
                        }))}
                        placeholder="0"
                        className="w-28 bg-transparent text-right text-sm tabular-nums text-foreground focus:outline-none"
                        aria-label={`${label} planned budget`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="budget-input" className="mb-1.5 block font-medium text-muted-foreground text-sm">
                  Total Budget
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="flex shrink-0 items-center justify-center px-3 py-2.5 border-r border-border">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </div>
                  <input
                    id="budget-input"
                    type="text"
                    inputMode="numeric"
                    value={displayBudget}
                    onChange={(e) => {
                      const stripped = e.target.value.replace(/[^0-9.]/g, "")
                      const [intPart, decPart] = stripped.split(".")
                      const formatted = intPart
                        ? Number(intPart).toLocaleString() + (decPart !== undefined ? "." + decPart : "")
                        : ""
                      setDisplayBudget(formatted)
                      setRawBudget(stripped)
                    }}
                    placeholder="e.g., 10,000,000"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <ActionDisabledHint
                id="budget-save-disabled-reason"
                reason={budgetSaveDisabledReason ?? categoryBudgetError}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={isUpdating || Boolean(budgetSaveDisabledReason) || Boolean(categoryBudgetError)}
                  aria-describedby={budgetSaveDisabledReason || categoryBudgetError ? "budget-save-disabled-reason" : undefined}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-chromatic-aurora to-chromatic-ocean px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {isUpdating ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      Save Budget
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBudget(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ExpenseSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
          tripBudget={trip?.budget}
          onEditBudget={openEditBudget}
        />
      </div>
      )}

    </main>
  )
}
