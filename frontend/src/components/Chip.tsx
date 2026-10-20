import { forwardRef, type ButtonHTMLAttributes, type ComponentType } from "react"

import { cn } from "@/lib/utils"

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Selected state, exposed as aria-pressed. Leave out for a plain action chip. */
  pressed?: boolean
  /**
   * filter: list filters (All / Food / Day 2), a pill tinted when selected.
   * option: a choice inside a form (stay type, category), solid primary when selected.
   */
  variant?: "filter" | "option"
  icon?: ComponentType<{ className?: string }>
  /** Extra classes for the icon, e.g. a category tint. */
  iconClassName?: string
}

/** Toggle chip. Use instead of a hand-styled <button aria-pressed>. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, variant = "filter", icon: Icon, iconClassName, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "filter"
          ? cn(
              "h-9 rounded-full px-3.5 font-semibold",
              pressed
                ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                : "bg-card text-foreground hover:bg-muted",
            )
          : cn(
              "h-10 rounded-full px-3.5",
              pressed
                ? "border-transparent bg-primary font-semibold text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted",
            ),
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            pressed ? "text-primary-soft-foreground" : "text-muted-foreground",
            // A category tint would be unreadable on the solid selected chip.
            variant === "option" && pressed ? "text-primary-foreground" : iconClassName,
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
})
