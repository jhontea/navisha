"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"

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
        />
      )}
      {!trip && isLoading && (
        <div className="h-40 w-full animate-pulse bg-muted" />
      )}
      <TripTabBar tripId={id} />
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        {editingBudget && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  {trip?.budget && trip.budget > 0 ? "Edit Budget" : "Set Budget"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Budget in {trip?.base_currency ?? "IDR"}
                </p>
              </div>
              <button type="button" onClick={() => setEditingBudget(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-full">
                <label className="mb-1.5 block font-medium text-muted-foreground text-sm">Total Budget</label>
                <div className="flex items-center overflow-hidden rounded-lg border bg-background transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <div className="flex shrink-0 items-center justify-center px-3">
                    <span className="material-symbols-outlined text-muted-foreground text-lg">payments</span>
                  </div>
                  <span className="h-6 w-px shrink-0 bg-border" />
                  <input type="text" inputMode="numeric" value={displayBudget}
                    onChange={(e) => { const stripped = e.target.value.replace(/[^0-9.]/g, ""); const [intPart, decPart] = stripped.split("."); const formatted = intPart ? Number(intPart).toLocaleString() + (decPart !== undefined ? "." + decPart : "") : ""; setDisplayBudget(formatted); setRawBudget(stripped) }}
                    placeholder="e.g., 10,000,000"
                    className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveBudget} disabled={updateTripMut.isPending}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {updateTripMut.isPending ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </div>
          </div>
        )}
        <ExpenseSection tripId={id} tripBaseCurrency={trip?.base_currency ?? "IDR"} tripBudget={trip?.budget} onEditBudget={openEditBudget} />
      </div>
    </main>
  )
}