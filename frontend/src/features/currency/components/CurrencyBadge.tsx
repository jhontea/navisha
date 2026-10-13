import { cn } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

/**
 * Small chip with the currency symbol (Rp, $, ¥, …). Replaces flag emoji,
 * which Windows does not render. Decorative: the code/name is always shown
 * as text next to it.
 */
export function CurrencyBadge({ code, className }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-background px-1.5 text-xs font-semibold text-muted-foreground tabular-nums",
        className,
      )}
    >
      {getCurrencySymbol(code)}
    </span>
  )
}
