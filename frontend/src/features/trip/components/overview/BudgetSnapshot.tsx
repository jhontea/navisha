import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"

/** Planned vs spent in one line; category detail lives on the Budget tab. */
export function BudgetSnapshot({
  tripId,
  budget,
  currency,
  spent,
}: {
  tripId: string
  budget: number
  currency: string
  /** Undefined while the expense summary is loading. */
  spent?: number
}) {
  const href = `/trips/${tripId}/budget`

  if (budget <= 0) {
    return (
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        Set a budget to compare it with what you spend.
        <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </Link>
    )
  }

  const remaining = budget - (spent ?? 0)
  const over = remaining < 0

  return (
    <section aria-labelledby="overview-budget-heading" className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 id="overview-budget-heading" className="text-sm font-semibold text-foreground">
          Budget
        </h3>
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
          Details
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <Progress value={spent ?? 0} max={budget} label="Budget used" tone={over ? "danger" : "default"} />
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Planned</dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatCurrency(budget, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Spent</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {spent === undefined ? "—" : formatCurrency(spent, currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{over ? "Over" : "Left"}</dt>
          <dd className={cn("font-semibold tabular-nums", over ? "text-destructive" : "text-foreground")}>
            {spent === undefined ? "—" : formatCurrency(Math.abs(remaining), currency)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
