"use client"

import { NativeSelect } from "@/components/NativeSelect"
import { Chip } from "@/components/Chip"
import { useState } from "react"
import dynamic from "next/dynamic"
import { ChevronDown, MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { MoneyText } from "@/components/MoneyText"
import { ResponsiveSheet } from "@/components/ResponsiveSheet"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { scheduleDelete, usePendingDeletes } from "@/lib/pendingDeletes"
import { cn } from "@/lib/utils"
import { categoryRank, getCategoryColor } from "../categoryColors"
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from "../hooks/useExpenses"
import type { CreateExpenseInput, Expense } from "../types"

const ExpenseForm = dynamic(
  () => import("./ExpenseForm").then((module) => module.ExpenseForm),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" /> },
)

// date-* keep the per-date grouping; amount-* / category-* flatten into a single list.
type SortMode = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "category-asc"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
  { value: "category-asc", label: "Category" },
]

const MENU_ITEM = "min-h-10 px-3 text-sm"

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

interface Props {
  tripId: string
  tripBaseCurrency: string
  tripStartDate?: string
  tripEndDate?: string
}

/** Expense list with category filter and sort; add and edit open in a sheet. */
export function ExpenseSection({ tripId, tripBaseCurrency, tripStartDate, tripEndDate }: Props) {
  const { data, isLoading, isError } = useExpenses(tripId)
  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; expense: Expense } | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>("date-desc")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const createMut = useCreateExpense(tripId)
  const updateMut = useUpdateExpense(sheet?.mode === "edit" ? sheet.expense.id : "", tripId)
  const deleteMut = useDeleteExpense(tripId)

  const pendingDeletes = usePendingDeletes()
  const allItems = (data?.items ?? []).filter((e) => !pendingDeletes.has(e.id))
  const presentCategories = Array.from(new Set(allItems.map((e) => e.category as string))).sort(
    (a, b) => categoryRank(a) - categoryRank(b),
  )
  const activeFilter = categoryFilter && presentCategories.includes(categoryFilter) ? categoryFilter : null
  const items = activeFilter ? allItems.filter((e) => e.category === activeFilter) : allItems
  const isDateSort = sortMode === "date-desc" || sortMode === "date-asc"

  const grouped: { date: string; expenses: Expense[] }[] = []
  if (isDateSort) {
    for (const e of items) {
      const group = grouped.find((g) => g.date === e.expense_date)
      if (group) group.expenses.push(e)
      else grouped.push({ date: e.expense_date, expenses: [e] })
    }
    grouped.sort((a, b) => (sortMode === "date-asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
  }

  // converted_amount is normalised to the base currency, so amounts compare across currencies.
  const flatSorted = isDateSort
    ? []
    : [...items].sort((a, b) => {
        if (sortMode === "amount-desc") return b.converted_amount - a.converted_amount
        if (sortMode === "amount-asc") return a.converted_amount - b.converted_amount
        return categoryRank(a.category) - categoryRank(b.category) || a.title.localeCompare(b.title)
      })

  const toggleGroup = (date: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })

  function renderRow(e: Expense) {
    const cfg = getCategoryColor(e.category)
    const sameCurrency = e.currency === e.base_currency
    const meta = [cfg.label, !isDateSort ? formatShortDate(e.expense_date) : null, e.note || null]
      .filter(Boolean)
      .join(" · ")

    return (
      <li key={e.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
          <cfg.Icon className={cn("h-4 w-4", cfg.text)} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{e.title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
        <div className="shrink-0 text-right">
          <MoneyText amount={e.amount} currency={e.currency} className="block text-sm font-extrabold text-foreground" />
          {!sameCurrency && (
            <span className="block text-xs text-muted-foreground">
              ≈ <MoneyText amount={e.converted_amount} currency={e.base_currency} />
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${e.title}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "-mr-1 shrink-0 text-muted-foreground" })}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className={MENU_ITEM} onClick={() => setSheet({ mode: "edit", expense: e })}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className={MENU_ITEM}
              variant="destructive"
              onClick={() =>
                scheduleDelete({
                  id: e.id,
                  message: "Expense deleted.",
                  errorMessage: "Couldn’t delete this expense. It’s back in the list.",
                  commit: () => deleteMut.mutateAsync(e.id),
                })
              }
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    )
  }

  return (
    <section aria-labelledby="expenses-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="expenses-heading" className="font-display text-xl font-extrabold text-foreground">
            Expenses
          </h2>
          {allItems.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {allItems.length} {allItems.length === 1 ? "expense" : "expenses"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {allItems.length > 1 && (
            <NativeSelect
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort expenses"
              className="w-auto bg-card"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          )}
          <Button onClick={() => setSheet({ mode: "add" })}>
            <Plus aria-hidden="true" />
            Add expense
          </Button>
        </div>
      </div>

      {presentCategories.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none lg:flex-wrap lg:overflow-visible" role="group" aria-label="Filter by category">
          {[null, ...presentCategories].map((category) => {
            const pressed = activeFilter === category
            const label = category ? getCategoryColor(category).label : "All"
            return (
              <Chip key={category ?? "all"} pressed={pressed} onClick={() => setCategoryFilter(category)}>
                {label}
              </Chip>
            )
          })}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2" aria-label="Loading expenses">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="rounded-2xl bg-destructive-bg p-6 text-center text-sm text-destructive">
          Couldn&apos;t load expenses. Check your connection and reload the page.
        </p>
      )}

      {!isLoading && !isError && allItems.length === 0 && (
        <EmptyState
          icon={Receipt}
          size="sm"
          title="No expenses yet"
          description="Add what you spend on food, transport and activities to track your budget."
          className="rounded-2xl border-2 border-dashed bg-card/60"
        />
      )}

      {!isLoading && !isError && isDateSort && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map((group) => {
            const groupTotal = group.expenses.reduce((sum, e) => sum + e.converted_amount, 0)
            const baseCurrency = group.expenses[0]?.base_currency ?? tripBaseCurrency
            const isCollapsed = collapsedGroups.has(group.date)
            return (
              <div key={group.date}>
                {/* eslint-disable-next-line no-restricted-syntax -- collapsible date-group header row */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.date)}
                  aria-expanded={!isCollapsed}
                  className="-mx-1 mb-1 flex min-h-11 w-[calc(100%+0.5rem)] items-center justify-between gap-3 rounded-lg px-1 text-sm hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2 font-display font-extrabold text-foreground">
                    <ChevronDown
                      className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}
                      aria-hidden="true"
                    />
                    {formatGroupDate(group.date)}
                  </span>
                  <MoneyText amount={groupTotal} currency={baseCurrency} className="text-muted-foreground" />
                </button>
                {!isCollapsed && (
                  <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
                    {group.expenses.map(renderRow)}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && !isError && !isDateSort && flatSorted.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">{flatSorted.map(renderRow)}</ul>
      )}

      <ResponsiveSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet?.mode === "edit" ? "Edit expense" : "Add expense"}
      >
        {sheet?.mode === "add" && (
          <ExpenseForm
            tripBaseCurrency={tripBaseCurrency}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            isSubmitting={createMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input: CreateExpenseInput) => {
              await createMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
        {sheet?.mode === "edit" && (
          <ExpenseForm
            initial={sheet.expense}
            tripBaseCurrency={tripBaseCurrency}
            isSubmitting={updateMut.isPending}
            onCancel={() => setSheet(null)}
            onSubmit={async (input) => {
              await updateMut.mutateAsync(input)
              setSheet(null)
            }}
          />
        )}
      </ResponsiveSheet>

    </section>
  )
}
