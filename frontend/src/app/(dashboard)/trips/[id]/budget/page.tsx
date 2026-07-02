"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

import { BottomSheet } from "@/components/BottomSheet"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { useTrip, useUpdateTrip, useDeleteTrip } from "@/features/trip/hooks/useTrips"
import { DestinationAutocomplete } from "@/features/trip/components/DestinationAutocomplete"
import { cn } from "@/lib/utils"
import { ExpenseSection } from "@/features/expense/components/ExpenseSection"
import { TripHero } from "@/features/trip/components/TripHero"
import { TripTabBar } from "@/features/trip/components/TripTabBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useSlideDirection } from "@/hooks/useSlideDirection"

export default function TripBudgetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const { mutate: updateTrip, isPending: isUpdating } = useUpdateTrip(id)
  const { mutate: deleteTrip, isPending: isDeleting } = useDeleteTrip()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const slideClass = useSlideDirection()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCover, setEditCover] = useState("")

  const [editingBudget, setEditingBudget] = useState(false)
  const [displayBudget, setDisplayBudget] = useState("")
  const [rawBudget, setRawBudget] = useState("")

  const startEditing = () => {
    if (!trip) return
    setEditTitle(trip.title)
    setEditDescription(trip.description ?? "")
    setEditStartDate(trip.start_date)
    setEditEndDate(trip.end_date)
    setEditCover(trip.cover_image_url ?? "")
    setIsEditing(true)
  }

  const saveEdits = () => {
    if (!editTitle.trim() || !trip) return
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

  const onDelete = () => {
    deleteTrip(id, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  const handleSaveBudget = async () => {
    if (!trip) return
    const budget = Number(rawBudget)
    if (isNaN(budget) || budget < 0) return
    updateTrip({
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
          onEdit={startEditing}
          onDelete={() => setConfirmDelete(true)}
          isDeleting={isDeleting}
        />
      )}
      {!trip && isLoading && (
        <Skeleton variant="glass" className="h-40 w-full rounded-none" />
      )}
      <TripTabBar tripId={id} />

      <div className={cn("mx-auto w-full max-w-max-width px-margin-mobile py-6 md:px-margin-desktop md:py-8 animate-fade-in", slideClass)}>
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={isUpdating || !rawBudget}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${trip?.title}"?`}
        description="This will permanently remove the trip and all its days, activities, and expenses. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        onConfirm={onDelete}
      />

      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title="Edit Trip">
        <div className="space-y-3">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Trip title"
            className="w-full rounded-lg border border-primary bg-background px-3 py-1.5 text-lg font-bold focus:outline-none"
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
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          {editCover && (
            <div className="relative h-28 w-full overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editCover} alt="Cover preview" className="h-full w-full object-cover" onError={() => setEditCover("")} />
              <button type="button" onClick={() => setEditCover("")} className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70">Remove</button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start date</label>
              <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none" disabled={isUpdating} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End date</label>
              <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none" disabled={isUpdating} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={saveEdits} disabled={isUpdating || !editTitle.trim()} className="flex-1">
              <Check className="h-4 w-4" /> {isUpdating ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
    </main>
  )
}
