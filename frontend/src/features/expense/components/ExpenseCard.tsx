"use client"

import { Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Expense } from "../types"

interface Props {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function ExpenseCard({ expense, onEdit, onDelete, isDeleting }: Props) {
  const sameCurrency = expense.currency === expense.base_currency
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onEdit()
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card p-3 transition-colors",
        "hover:border-primary/40 hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{expense.title}</h3>
            <Badge variant="secondary">{expense.category}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(expense.created_at)}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          {!sameCurrency && (
            <p className="text-xs text-muted-foreground tabular-nums">
              ≈ {formatCurrency(expense.converted_amount, expense.base_currency)}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Delete expense"
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive opacity-0 transition-opacity hover:bg-destructive/10 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
