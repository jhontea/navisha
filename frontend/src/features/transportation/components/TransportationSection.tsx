"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useCreateTransportation,
  useDeleteTransportation,
  useTransportations,
  useUpdateTransportation,
} from "../hooks/useTransportations"
import type { CreateTransportationInput, Transportation } from "../types"
import { TransportationForm } from "./TransportationForm"
import {
  Bus,
  Car,
  Pencil,
  Plane,
  Ship,
  Train,
  TramFront,
  Boxes,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_ICON: Record<string, typeof Plane> = {
  flight: Plane,
  bus: Bus,
  train: Train,
  ferry: TramFront,
  ship: Ship,
  car: Car,
  other: Boxes,
}

const TYPE_COLOR: Record<string, string> = {
  flight: "bg-[#DBEAFE] text-primary",
  bus: "bg-muted text-muted-foreground",
  train: "bg-secondary/10 text-secondary",
  ferry: "bg-[#EDE9FE] text-[#7C3AED]",
  ship: "bg-[#EDE9FE] text-[#7C3AED]",
  car: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
}

interface Props {
  tripId: string
  tripBaseCurrency: string
}

export function TransportationSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useTransportations(tripId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] =
    useState<Transportation | null>(null)

  const createMut = useCreateTransportation(tripId)
  const updateMut = useUpdateTransportation(editingId ?? "", tripId)
  const deleteMut = useDeleteTransportation(tripId)

  const items = data?.items ?? []

  return (
    <div className="space-y-10">
      {/* Add Transportation Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-1">
            Add Transportation
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your flights, trains, and transfers to keep your itinerary organized.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border/40 rounded-2xl shadow-sm p-8">
          {addOpen ? (
            <TransportationForm
              tripBaseCurrency={tripBaseCurrency}
              withCost
              isSubmitting={createMut.isPending}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (input: CreateTransportationInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H4a2 2 0 0 0-1.4 3.4L8 12 6.2 19.2a1 1 0 0 0 1.4 1.1L12 18l4.4 2.3a1 1 0 0 0 1.4-1.1Z"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Log a transportation
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add flights, trains, buses, or any other transport
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Add Transport
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Travel List */}
      {(isLoading || items.length > 0 || isError) && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Upcoming Travel
            </h3>
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
              Failed to load transportation entries.
            </p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No transportation logged yet.
            </p>
          )}

          <div className="space-y-4">
            {items.map((t) => {
              const isEditing = editingId === t.id
              const Icon = TYPE_ICON[t.type] ?? Boxes
              const iconBg = TYPE_COLOR[t.type] ?? TYPE_COLOR.other
              const depTime = t.departure_datetime
                ? new Date(t.departure_datetime.replace(/Z$|[+-]\d{2}:\d{2}$/, "")).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null

              if (isEditing) {
                return (
                  <div key={t.id} className="rounded-2xl border bg-card p-6 shadow-sm">
                    <TransportationForm
                      initial={t}
                      lockType
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
                  key={t.id}
                  className="group bg-card border-l-4 border-l-primary rounded-xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:shadow-md transition-shadow"
                >
                  {/* Left: icon + route */}
                  <div className="flex items-center gap-5">
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                        iconBg,
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      {(t.from_location || t.to_location) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {t.from_location || "—"}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          <span className="text-lg font-bold text-foreground">
                            {t.to_location || "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-foreground capitalize">
                          {t.type}
                        </span>
                      )}
                      {t.label && (
                        <p className="text-sm font-medium text-foreground/80 mt-0.5">
                          {t.label}
                        </p>
                      )}
                      {t.operator && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.operator}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Departure */}
                  {depTime && (
                    <div className="flex flex-col">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Departure
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{depTime}</p>
                    </div>
                  )}

                  {/* Label */}
                  {t.label && (
                    <div className="flex flex-col">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Label
                      </p>
                      <p className="text-sm font-semibold text-primary font-mono mt-0.5">
                        {t.label}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Edit transportation"
                      onClick={() => setEditingId(t.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete transportation"
                      disabled={deleteMut.isPending && deleteMut.variables === t.id}
                      onClick={() => setConfirmingDelete(t)}
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
        title={`Delete "${confirmingDelete?.label || confirmingDelete?.type || ""}"?`}
        description="This transportation entry will be permanently removed."
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
