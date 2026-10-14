"use client"

import { useState } from "react"

import { ActionDisabledHint } from "@/components/forms/ActionDisabledHint"
import { FormActions } from "@/components/forms/FormActions"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { getBudgetSaveDisabledReason } from "@/features/trip/lib/actionability"
import { CATEGORY_ORDER, getCategoryColor } from "../categoryColors"

export interface BudgetFormValues {
  budget: number
  budgetCategories: Record<string, number>
}

interface Props {
  currency: string
  initialBudget?: number
  initialCategories?: Record<string, number>
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (values: BudgetFormValues) => void
}

const toDraft = (n?: number) => (n && n > 0 ? String(n) : "")
const clean = (v: string) => v.replace(/[^0-9.]/g, "")
const amountOf = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
/** "1234567.5" -> "1,234,567.5" while typing. */
function withSeparators(raw: string): string {
  if (!raw) return ""
  const [intPart, decPart] = raw.split(".")
  return Number(intPart || "0").toLocaleString("en-US") + (decPart !== undefined ? `.${decPart}` : "")
}

/** Total trip budget plus optional planned amounts per category. */
export function BudgetForm({ currency, initialBudget, initialCategories, isSubmitting, onCancel, onSubmit }: Props) {
  const [total, setTotal] = useState(toDraft(initialBudget))
  const [categories, setCategories] = useState<Record<string, string>>(() =>
    Object.fromEntries(CATEGORY_ORDER.map((c) => [c, toDraft(initialCategories?.[c])])),
  )

  const totalAmount = amountOf(total)
  const plannedSum = Object.values(categories).reduce((sum, v) => sum + amountOf(v), 0)
  const categoryError =
    totalAmount > 0 && plannedSum > totalAmount ? "Category plans add up to more than the total budget." : null
  const disabledReason = getBudgetSaveDisabledReason(total) ?? categoryError

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (disabledReason || isSubmitting) return
    const budgetCategories: Record<string, number> = {}
    for (const [c, v] of Object.entries(categories)) {
      if (amountOf(v) > 0) budgetCategories[c] = amountOf(v)
    }
    onSubmit({ budget: totalAmount, budgetCategories })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget-total" className="text-sm font-medium text-foreground">
            Total budget ({currency})
          </label>
          <Input
            id="budget-total"
            inputMode="decimal"
            autoFocus
            value={withSeparators(total)}
            onChange={(e) => setTotal(clean(e.target.value))}
            placeholder="e.g. 10,000,000"
            className="h-11 text-base tabular-nums md:h-10 md:text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Plan by category <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <span className={cn("text-xs tabular-nums", categoryError ? "font-medium text-destructive" : "text-muted-foreground")}>
              {formatMoney(plannedSum, currency)} planned
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORY_ORDER.map((category) => {
              const cfg = getCategoryColor(category)
              return (
                <label
                  key={category}
                  className="flex h-11 items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50"
                >
                  <cfg.Icon className={cn("h-4 w-4 shrink-0", cfg.text)} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{cfg.label}</span>
                  <Input
            variant="bare"
                    inputMode="decimal"
                    value={withSeparators(categories[category] ?? "")}
                    onChange={(e) => setCategories((cur) => ({ ...cur, [category]: clean(e.target.value) }))}
                    placeholder="0"
                    aria-label={`${cfg.label} planned amount`}
                    className="h-auto w-36 min-w-0 bg-transparent text-right text-base tabular-nums text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
                  />
                </label>
              )
            })}
          </div>
        </div>
      </fieldset>

      <ActionDisabledHint id="budget-save-disabled-reason" reason={total ? disabledReason : categoryError} />
      <FormActions
        submitLabel="Save budget"
        isSubmitting={isSubmitting}
        submitDisabled={Boolean(disabledReason)}
        submitAriaDescribedBy={disabledReason ? "budget-save-disabled-reason" : undefined}
        onCancel={onCancel}
      />
    </form>
  )
}
