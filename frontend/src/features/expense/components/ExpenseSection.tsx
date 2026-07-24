"use client"

import { useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ChevronDown, Pencil, Trash2, X } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from "../hooks/useExpenses"
import type { CreateExpenseInput, Expense } from "../types"
import { BudgetSummary } from "./BudgetSummary"
import { ExpenseForm } from "./ExpenseForm"

import { CATEGORY_COLORS } from "../categoryColors"

const CATEGORY_CONFIG = CATEGORY_COLORS as Record<string, typeof CATEGORY_COLORS[string]>

// W-BUD-06 — Sort modes for the expenses list.
// date-* keep the per-date grouping; amount-* / category-* flatten into a single list.
type SortMode = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "category-asc"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "date-desc", label: "Date (newest)" },
  { value: "date-asc", label: "Date (oldest)" },
  { value: "amount-desc", label: "Amount (high → low)" },
  { value: "amount-asc", label: "Amount (low → high)" },
  { value: "category-asc", label: "Category (A → Z)" },
]

const DEFAULT_SORT: SortMode = "date-desc"

function formatExpenseDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatGroupDate(dateStr: string): string {
  if (!dateStr) return "Unknown date"
  const d = new Date(dateStr + "T00:00:00")
  // Guard against zero/invalid dates (e.g. old expenses before migration)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "Unknown date"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.getTime() === today.getTime()) return "Today"
  if (d.getTime() === yesterday.getTime()) return "Yesterday"
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

interface Props {
  tripId: string
  tripBaseCurrency: string
  tripBudget?: number
  onEditBudget?: () => void
}

export function ExpenseSection({ tripId, tripBaseCurrency, tripBudget, onEditBudget }: Props) {
  const { data, isLoading, isError } = useExpenses(tripId)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Expense | null>(null)
  // Track which date groups are collapsed; all expanded by default
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // W-BUD-06 — sort mode for the expenses list. Defaults to current behaviour (newest first).
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT)

  // ponytail: scroll the Add Expense card into view when it opens, so the form is reachable on mobile
  const addCardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (addOpen && addCardRef.current) {
      addCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [addOpen])

  function toggleGroup(date: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const createMut = useCreateExpense(tripId)
  const updateMut = useUpdateExpense(editingId ?? "", tripId)
  const deleteMut = useDeleteExpense(tripId)

  const items = data?.items ?? []

  // W-BUD-06 — date modes keep the per-date grouping; amount/category modes flatten.
  const isDateSort = sortMode === "date-desc" || sortMode === "date-asc"

  // Group expenses by expense_date (always set, defaults to today at create time)
  const grouped: { date: string; expenses: Expense[] }[] = []
  for (const e of items) {
    const dateKey = e.expense_date
    const group = grouped.find((g) => g.date === dateKey)
    if (group) {
      group.expenses.push(e)
    } else {
      grouped.push({ date: dateKey, expenses: [e] })
    }
  }
  // Sort date groups newest or oldest first depending on mode
  grouped.sort((a, b) =>
    sortMode === "date-asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )

  // Flat list for amount / category sorts (converted_amount is normalised to base currency)
  const flatSorted: Expense[] = isDateSort
    ? []
    : [...items].sort((a, b) => {
        if (sortMode === "amount-desc") return b.converted_amount - a.converted_amount
        if (sortMode === "amount-asc") return a.converted_amount - b.converted_amount
        // category-asc — compare by category label, fallback to title
        const labelA = CATEGORY_CONFIG[a.category]?.label ?? a.category
        const labelB = CATEGORY_CONFIG[b.category]?.label ?? b.category
        return labelA.localeCompare(labelB) || a.title.localeCompare(b.title)
      })

  // W-BUD-06 — shared expense row renderer so grouped and flat lists stay in sync.
  function renderExpenseRow(e: Expense) {
    const isEditing = editingId === e.id
    const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.other
    const sameCurrency = e.currency === e.base_currency

    if (isEditing) {
      return (
        <div key={e.id} className="p-6 bg-accent/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-label-md text-foreground">Edit expense</h4>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ExpenseForm
            initial={e}
            tripBaseCurrency={tripBaseCurrency}
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
        key={e.id}
        className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              cfg.bg, cfg.text,
            )}
          >
            <cfg.Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h5 className="font-label-md text-foreground">{e.title}</h5>
            <p className="text-label-sm text-muted-foreground mt-0.5">
              {cfg.label}
              {!isDateSort && (
                <span className="ml-1 text-muted-foreground/70">· {formatExpenseDate(e.expense_date)}</span>
              )}
              {e.note && (
                <span className="ml-1 text-muted-foreground/70">· {e.note}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p className="font-display text-headline-sm text-foreground">
              {formatCurrency(e.amount, e.currency)}
            </p>
            {!sameCurrency && (
              <p className="text-[10px] text-muted-foreground font-medium">
                ≈ {formatCurrency(e.converted_amount, e.base_currency)}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Edit expense"
            onClick={() => setEditingId(e.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete expense"
            disabled={deleteMut.isPending && deleteMut.variables === e.id}
            onClick={() => setConfirmingDelete(e)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              "text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Budget Overview */}
      <section>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-headline-md text-foreground mb-1">Budget Overview</h3>
            <p className="text-muted-foreground font-body-md">Keep track of your expenses in real-time.</p>
          </div>
          {!tripBudget && onEditBudget && (
            <button
              type="button"
              onClick={onEditBudget}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-label-md hover:border-primary hover:text-primary transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Set Budget
            </button>
          )}
          {tripBudget && onEditBudget && (
            <button
              type="button"
              onClick={onEditBudget}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-label-md hover:border-primary hover:text-primary transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Budget
            </button>
          )}
        </div>
        <BudgetSummary tripId={tripId} tripBudget={tripBudget} />
      </section>

      {/* Add Expense Form */}
      <section ref={addCardRef}>
        <div className="glass rounded-xl p-8">
          <h3 className="font-display text-headline-sm text-foreground mb-6">Add New Expense</h3>

          {addOpen ? (
            <ExpenseForm
              tripBaseCurrency={tripBaseCurrency}
              isSubmitting={createMut.isPending}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (input: CreateExpenseInput) => {
                await createMut.mutateAsync(input)
                setAddOpen(false)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-chromatic-sunset via-chromatic-aurora to-chromatic-sky text-white shadow-md shadow-chromatic-sunset/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Log an expense</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Track food, transport, activities, and more
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky px-6 py-2.5 font-label-md text-white shadow-md shadow-chromatic-sunset/20 transition-all hover:shadow-lg hover:shadow-chromatic-sunset/30 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                Add Expense
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Expenses List — grouped by date (date modes) or flat (amount/category modes) */}
      {(isLoading || items.length > 0 || isError) && (
        <section>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h3 className="font-display text-headline-sm text-foreground">Recent Expenses</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="sr-only">Sort expenses</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground font-label-md hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
                  aria-label="Sort expenses"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "expense" : "expenses"}
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 glass" />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-destructive">
              Failed to load expenses.
            </p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No expenses logged yet.
            </p>
          )}

          {!isLoading && !isError && isDateSort && grouped.length > 0 && (
            <div className="space-y-6">
              {grouped.map((group) => {
                const groupTotal = group.expenses.reduce((sum, e) => sum + e.converted_amount, 0)
                const baseCurrency = group.expenses[0]?.base_currency ?? tripBaseCurrency

                const isCollapsed = collapsedGroups.has(group.date)

                return (
                  <div key={group.date}>
                    {/* Date group header — click to collapse/expand */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.date)}
                      aria-expanded={!isCollapsed}
                      className="w-full flex items-center justify-between mb-3 group/header rounded-lg px-1 py-0.5 -mx-1 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
                            isCollapsed && "-rotate-90",
                          )}
                          aria-hidden="true"
                        />
                        <span className="font-label-md text-foreground">{formatGroupDate(group.date)}</span>
                        <span className="text-label-sm text-muted-foreground">· {formatExpenseDate(group.date)}</span>
                      </div>
                      <span className="text-label-sm text-muted-foreground font-medium">
                        {formatCurrency(groupTotal, baseCurrency)}
                      </span>
                    </button>

                    <div className={cn("glass overflow-hidden rounded-xl transition-all duration-200", isCollapsed && "hidden")}>
                      <div className="divide-y divide-border/30">
                        {group.expenses.map((e) => renderExpenseRow(e))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* W-BUD-06 — flat list for amount / category sorts (no date grouping) */}
          {!isLoading && !isError && !isDateSort && flatSorted.length > 0 && (
            <div className="glass overflow-hidden rounded-xl">
              <div className="divide-y divide-border/30">
                {flatSorted.map((e) => renderExpenseRow(e))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Confirm Delete */}
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
