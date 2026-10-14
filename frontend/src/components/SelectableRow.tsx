import type { ReactNode } from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A row the user ticks to keep (AI suggestions, generated draft activities):
 * a checkbox mark followed by any content, toggled as a whole.
 */
export function SelectableRow({
  selected,
  onToggle,
  disabled,
  children,
}: {
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex min-h-11 w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        selected ? "border-primary/40 bg-primary-soft/60" : "bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-transparent",
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      {children}
    </button>
  )
}
