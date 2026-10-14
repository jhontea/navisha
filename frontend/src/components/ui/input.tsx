import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  /**
   * default: bordered field.
   * bare: no border, background or focus ring, for an input sitting inside a
   * wrapper that draws them (icon + input groups, inline amount fields).
   */
  variant?: "default" | "bare"
}

const VARIANT: Record<NonNullable<InputProps["variant"]>, string> = {
  default:
    "h-11 rounded-xl border border-input bg-card px-4 py-1 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  bare: "h-auto border-0 bg-transparent p-0 focus-visible:ring-0",
}

// Field style shared by every form (docs/DESIGN.md §5): 44px, rounded-xl, card fill.
// Native <input> wrapped in forwardRef so React Hook Form's register() ref attaches.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full min-w-0 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
