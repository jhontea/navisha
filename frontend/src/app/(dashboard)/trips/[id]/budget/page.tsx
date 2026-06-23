"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { useTrip, useUpdateTrip } from "@/features/trip/hooks/useTrips"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { formatDateRange } from "@/lib/utils"
import { cn } from "@/lib/utils"

export default function TripBudgetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data: trip, isLoading } = useTrip(id)
  const updateTripMut = useUpdateTrip(id)

  const [editingBudget, setEditingBudget] = useState(false)
  // displayBudget: formatted with commas; rawBudget: numeric string for submission
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
    <main className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 px-4 py-4 backdrop-blur-md md:px-10 md:py-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Active Trip
          </span>
          {trip && (
            <span className="text-xs text-muted-foreground md:text-sm">
              · {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          )}
        </div>
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-3xl">
          {isLoading ? (
            <span className="block h-8 w-48 animate-pulse rounded bg-muted" />
          ) : (
            trip?.title ?? "Trip"
          )}
        </h1>
        {trip?.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{trip.description}</p>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8">
        <div className="mb-6">
          <Link
            href={`/trips/${id}/overview`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="m15 18-6-6 6-6"/></svg>
            Back to Trip Overview
          </Link>
        </div>
        {/* Inline budget edit panel */}

        {editingBudget && (
          <div className="mb-8 bg-card border border-primary/30 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-headline-sm text-foreground">
                  {trip?.budget && trip.budget > 0 ? "Edit Budget" : "Set Budget"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Budget in {trip?.base_currency ?? "IDR"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBudget(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-full">
                <label className="font-label-md text-muted-foreground block mb-1.5">
                  Total Budget
                </label>
                <div className="flex items-center rounded-lg border bg-background transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <div className="flex items-center justify-center px-3 shrink-0">
                    <span className="material-symbols-outlined text-muted-foreground text-[18px]">payments</span>
                  </div>
                  <span className="h-6 w-px bg-border shrink-0" />
                  <input
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
                    className="min-w-0 flex-1 px-4 py-2.5 bg-transparent border-0 outline-none font-body-md text-foreground placeholder:text-muted-foreground/60"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveBudget()}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBudget(false)}
                  className="hidden sm:inline-flex sm:w-auto px-4 py-2.5 rounded-lg border-border text-foreground font-label-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={updateTripMut.isPending || !rawBudget}
                  className={cn(
                    "w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-label-md whitespace-nowrap",
                    "shadow-md shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60",
                  )}
                >
                  {updateTripMut.isPending ? "Saving…" : "Save Budget"}
                </button>
              </div>
            </div>

          </div>
        )}

        <ExpenseSection
          tripId={id}
          tripBaseCurrency={trip?.base_currency ?? "IDR"}
          tripBudget={trip?.budget && trip.budget > 0 ? trip.budget : undefined}
          onEditBudget={openEditBudget}
        />
      </div>
    </main>
  )
}
