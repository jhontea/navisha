"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from "../hooks/useExpenses"
import type { CreateExpenseInput, Expense } from "../types"
import { BudgetSummary } from "./BudgetSummary"
import { ExpenseCard } from "./ExpenseCard"
import { ExpenseForm } from "./ExpenseForm"

interface Props {
  tripId: string
  tripBaseCurrency: string
}

export function ExpenseSection({ tripId, tripBaseCurrency }: Props) {
  const { data, isLoading, isError } = useExpenses(tripId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Expense | null>(null)

  const createMut = useCreateExpense(tripId)
  const updateMut = useUpdateExpense(editing?.id ?? "", tripId)
  const deleteMut = useDeleteExpense(tripId)

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <BudgetSummary tripId={tripId} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Expenses · {items.length}
        </h3>
        <Button size="sm" onClick={() => setCreating(true)}>
          + Add expense
        </Button>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading expenses…</p>
      )}
      {isError && (
        <p className="text-xs text-destructive">Failed to load expenses.</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No expenses yet for this trip.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((e) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            onEdit={() => setEditing(e)}
            onDelete={() => setConfirmingDelete(e)}
            isDeleting={
              deleteMut.isPending && deleteMut.variables === e.id
            }
          />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            tripBaseCurrency={tripBaseCurrency}
            isSubmitting={createMut.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input: CreateExpenseInput) => {
              await createMut.mutateAsync(input)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              initial={editing}
              tripBaseCurrency={tripBaseCurrency}
              isSubmitting={updateMut.isPending}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                await updateMut.mutateAsync(input)
                setEditing(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(o) => !o && setConfirmingDelete(null)}
        title={`Delete "${confirmingDelete?.title ?? ""}"?`}
        description="This expense will be permanently removed from the trip's budget."
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
