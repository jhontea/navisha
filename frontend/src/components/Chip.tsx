import { forwardRef, type ButtonHTMLAttributes, type ComponentType } from "react"

import { cn } from "@/lib/utils"

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Selected state, exposed as aria-pressed. Leave out for a plain action chip. */
  pressed?: boolean
  /**
   * filter: list filters (All / Food / Day 2), solid when selected.
   * option: a choice inside a form (stay type, category), tinted when selected.
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
        "inline-flex shrink-0 items-center gap-1.5 border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "filter"
          ? cn(
              "h-9 rounded-full px-3.5",
              pressed ? "border-foreground bg-foreground text-background" : "bg-card text-foreground hover:bg-muted",
            )
          : cn(
              "h-10 rounded-lg px-3",
              pressed
                ? "border-primary bg-primary/10 font-medium text-foreground"
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
            variant === "option" && pressed ? "text-primary" : "text-muted-foreground",
            pressed && variant === "filter" && "text-background",
            iconClassName,
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
})
