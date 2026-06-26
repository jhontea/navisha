"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useAccommodations,
  useCreateAccommodation,
  useDeleteAccommodation,
  useUpdateAccommodation,
} from "../hooks/useAccommodations"
import type { Accommodation, CreateAccommodationInput } from "../types"
import { ACCOMMODATION_TYPE_LABELS } from "../types"
import { AccommodationForm } from "./AccommodationForm"
import {
  Calendar,
  Hotel,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

const TYPE_COLOR: Record<string, string> = {
  hotel: "bg-[#EDE9FE] text-[#7C3AED]",
  hostel: "bg-[#DBEAFE] text-primary",
  apartment: "bg-[#DCFCE7] text-emerald-700",
  other: "bg-muted text-muted-foreground",
}

interface Props {
  tripId: string
  tripBaseCurrency: string
}

export function AccommodationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useAccommodations(tripId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Accommodation | null>(null)

  const createMut = useCreateAccommodation(tripId)
  const updateMut = useUpdateAccommodation(editingId ?? "", tripId)
  const deleteMut = useDeleteAccommodation(tripId)

  const items = data?.items ?? []

  return (
    <div className="space-y-10">
      {/* Add Stay Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-1">
            Add Accommodation
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your hotels, hostels, and apartments to keep everything organized.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-8">
          {addOpen ? (
            <AccommodationForm
              tripBaseCurrency={tripBaseCurrency}
              withCost
              isSubmitting={createMut.isPending}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (input: CreateAccommodationInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE9FE]">
                <Hotel className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Log a stay
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add hotels, hostels, apartments, or any other accommodation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Add Stay
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Planned Stays List */}
      {(isLoading || items.length > 0 || isError) && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Planned Stays
            </h3>
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "stay" : "stays"}
            </span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 glass" />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
              Failed to load stays.
            </p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No stays logged yet.
            </p>
          )}

          <div className="space-y-4">
            {items.map((a) => {
              const isEditing = editingId === a.id
              const typeColor = TYPE_COLOR[a.accommodation_type] ?? TYPE_COLOR.other
              const typeLabel = ACCOMMODATION_TYPE_LABELS[a.accommodation_type] ?? "Other"

              if (isEditing) {
                return (
                  <div key={a.id} className="glass rounded-2xl p-6">
                    <AccommodationForm
                      initial={a}
                      isSubmitting={updateMut.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        await updateMut.mutateAsync(input)
                        setEditingId(null)
                      }}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={a.id}
                  className="group bg-card border-l-4 border-l-[#8B5CF6] rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
                >
                  {/* Left: info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">
                        {a.name}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          typeColor,
                        )}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    {a.location_name && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{a.location_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatDate(a.check_in)} — {formatDate(a.check_out)}
                      </span>
                    </div>
                    {a.confirmation_number && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {a.confirmation_number}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Edit stay"
                      onClick={() => setEditingId(a.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete stay"
                      disabled={deleteMut.isPending && deleteMut.variables === a.id}
                      onClick={() => setConfirmingDelete(a)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
        title={`Delete "${confirmingDelete?.name ?? ""}"?`}
        description="This stay will be permanently removed from the trip."
        confirmLabel="Delete"
        destructive
        isPending={deleteMut.isPending}
        onConfirm={() => {
          if (confirmingDelete) {
            deleteMut.mutate(confirmingDelete.id, {
              onSettled: () => setConfirmingDelete(null),
            })
          }
        }}
      />
    </div>
  )
}
