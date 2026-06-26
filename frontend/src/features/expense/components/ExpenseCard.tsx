"use client"

import { memo } from "react"
import { Pencil, Trash2, Tag } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import type { Expense } from "../types"

interface Props {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const CATEGORY_CONFIG: Record<string, { emoji: string; bg: string; text: string }> = {
  accommodation: { emoji: "🏨", bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400" },
  transport:     { emoji: "✈️", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  food:          { emoji: "🍜", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  activity:      { emoji: "🎭", bg: "bg-pink-500/10",   text: "text-pink-600 dark:text-pink-400" },
  souvenir:      { emoji: "🎁", bg: "bg-emerald-500/10",text: "text-emerald-600 dark:text-emerald-400" },
  shopping:      { emoji: "🛍️", bg: "bg-teal-500/10",  text: "text-teal-600 dark:text-teal-400" },
  other:         { emoji: "📌", bg: "bg-slate-500/10",  text: "text-slate-600 dark:text-slate-400" },
}

const BORDER_BY_CATEGORY: Record<string, string> = {
  accommodation: "border-l-blue-400",
  transport:     "border-l-violet-400",
  food:          "border-l-orange-400",
  activity:      "border-l-pink-400",
  souvenir:      "border-l-emerald-400",
  shopping:      "border-l-teal-400",
  other:         "border-l-slate-300",
}

function getCategory(cat?: string) {
  if (!cat) return CATEGORY_CONFIG.other
  return CATEGORY_CONFIG[cat.toLowerCase()] ?? CATEGORY_CONFIG.other
}

/**
 * Expense card.
 * Iter 61 — category emoji icon with colored bg chip
 * Iter 62 — amount: tabular-nums, bold, right-aligned
 * Iter 63 — date: compact display below title
 * Iter 64 — action buttons: hover reveal on desktop
 * Iter 65 — colored left border by category
 */
export const ExpenseCard = memo(function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  isDeleting,
}: Props) {
  const cat = getCategory(expense.category)
  const borderColor = BORDER_BY_CATEGORY[expense.category?.toLowerCase()] ?? "border-l-slate-300"

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl border border-border/30 border-l-4 bg-card px-4 py-3 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/50",
        borderColor,
      )}
    >
      {/* Iter 61 — category emoji chip */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-transform duration-200 group-hover:scale-110",
          cat.bg,
        )}
        aria-hidden="true"
      >
        {cat.emoji}
      </div>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-foreground leading-snug">
          {expense.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {/* Iter 63 — expense_date below title */}
          {expense.expense_date && (
            <time className="text-[11px] text-muted-foreground tabular-nums">
              {new Date(expense.expense_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </time>
          )}
          {/* Category badge */}
          {expense.category && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                cat.bg,
                cat.text,
              )}
            >
              <Tag className="h-2.5 w-2.5" aria-hidden="true" />
              {expense.category}
            </span>
          )}
        </div>
        {/* Note */}
        {expense.note && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70 italic">
            {expense.note}
          </p>
        )}
      </div>

      {/* Iter 62 — amount: bold, tabular-nums, right-aligned */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-foreground tabular-nums">
          {formatCurrency(expense.amount, expense.currency)}
        </p>
        {expense.currency && (
          <p className="text-[10px] text-muted-foreground uppercase">{expense.currency}</p>
        )}
      </div>

      {/* Iter 64 — actions: hover on desktop, always on mobile */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit expense"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label="Delete expense"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive focus-visible:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
})
