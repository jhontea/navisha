"use client"

import { Pencil, Trash2 } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type { Expense, ExpenseCategory } from "../types"

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { bg: string; text: string; icon: string }
> = {
  accommodation: {
    bg: "bg-stay-purple",
    text: "text-[#7C3AED]",
    icon: "hotel",
  },
  transport: {
    bg: "bg-transport-blue",
    text: "text-primary",
    icon: "directions_subway",
  },
  food: {
    bg: "bg-budget-green",
    text: "text-emerald-700",
    icon: "restaurant",
  },
  activity: {
    bg: "bg-[#FFEDD5]",
    text: "text-indigo-600",
    icon: "local_activity",
  },
  souvenir: {
    bg: "bg-[#FCE7F3]",
    text: "text-pink-600",
    icon: "redeem",
  },
  shopping: {
    bg: "bg-[#FEF9C3]",
    text: "text-yellow-700",
    icon: "shopping_cart",
  },
  other: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: "receipt",
  },
}

interface Props {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function ExpenseCard({ expense, onEdit, onDelete, isDeleting }: Props) {
  const sameCurrency = expense.currency === expense.base_currency
  const cfg = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.other

  return (
    <div className="glass group flex items-center justify-between rounded-lg p-4 transition-all hover:bg-white/25">
      <div className="flex items-center gap-4">
        {/* Category icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            cfg.bg,
            cfg.text,
          )}
        >
          <span className="material-symbols-outlined text-[22px]">
            {cfg.icon}
          </span>
        </div>

        {/* Info */}
        <div>
          <h5
            role="button"
            tabIndex={0}
            onClick={onEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onEdit()
              }
            }}
            className="font-label-md text-foreground group-hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
          >
            {expense.title}
          </h5>
          <p className="text-label-sm text-muted-foreground mt-0.5 capitalize">
            {expense.category} · {formatDate(expense.created_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Amounts */}
        <div className="text-right mr-2">
          <p className="font-display text-headline-sm text-foreground">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          {!sameCurrency && (
            <p className="text-[10px] text-muted-foreground font-medium">
              ≈ {formatCurrency(expense.converted_amount, expense.base_currency)}
            </p>
          )}
        </div>

        {/* Edit */}
        <button
          type="button"
          aria-label="Edit expense"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </button>

        {/* Delete */}
        <button
          type="button"
          aria-label="Delete expense"
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            "opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50",
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
