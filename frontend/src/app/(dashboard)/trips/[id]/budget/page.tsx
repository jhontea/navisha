"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { Skeleton } from "@/components/ui/skeleton"

export default function TripBudgetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)
  const updateTripMut = useUpdateTrip(id)

  const [editingBudget, setEditingBudget] = useState(false)
  const [displayBudget, setDisplayBudget] = useState("")
  const [rawBudget, setRawBudget] = useState("")

  const handleSaveBudget = async () => {
    if (!trip) return
    const budget = Number(rawBudget)
    if (isNaN(budget) || budget < 0) return
    await updateTripMut.mutateAsync({
      title: trip.title,
      description: trip.description,
      start_date: trip.start_date,
      end_date: trip.end_date,
      base_currency: trip.base_currency,
      budget,
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
    setEditingBudget(true)
  }

  return (
    <main className="flex flex-col pb-4">
      {trip && (
        <TripHero
          title={trip.title}
          description={trip.description}
          startDate={trip.start_date}
          endDate={trip.end_date}
          baseCurrency={trip.base_currency}
          coverImageUrl={trip.cover_image_url}
        />
      )}
      {!trip && isLoading && (
        <Skeleton variant="glass" className="h-40 w-full rounded-none" />
      )}
      <TripTabBar tripId={id} />

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
                <label htmlFor="budget-input" className="mb-1.5 block font-medium text-muted-foreground text-sm">
                  Total Budget
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-outline-variant bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="flex shrink-0 items-center justify-center px-3 py-2.5 border-r border-outline-variant">
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={updateTripMut.isPending || !rawBudget}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {updateTripMut.isPending ? (
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
                  className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    </main>
  )
}
