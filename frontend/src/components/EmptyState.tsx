import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  /** Emoji shown instead of icon when no icon provided */
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Visual size variant */
  size?: "sm" | "md" | "lg"
}

/**
 * Generic empty state component.
 * Iter 91 — size variants (sm/md/lg)
 * Iter 92 — emoji support as alternative to icon
 * Iter 93 — subtle animated bg circle
 * Iter 94 — action slot accepts any ReactNode (not just button)
 * Iter 95 — motion: fade-in-up on mount
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const iconSizes = {
    sm: { wrapper: "h-12 w-12", icon: "h-5 w-5", emoji: "text-2xl" },
    md: { wrapper: "h-16 w-16", icon: "h-7 w-7", emoji: "text-3xl" },
    lg: { wrapper: "h-20 w-20", icon: "h-9 w-9", emoji: "text-4xl" },
  }

  const textSizes = {
    sm: { title: "text-sm font-semibold", desc: "text-xs" },
    md: { title: "text-base font-semibold", desc: "text-sm" },
    lg: { title: "text-lg font-bold", desc: "text-sm" },
  }

  const s = iconSizes[size]
  const t = textSizes[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in-up",
        size === "sm" ? "py-8 gap-3" : size === "lg" ? "py-16 gap-5" : "py-12 gap-4",
        className,
      )}
    >
      {/* Iter 93 — icon wrapper with subtle bg circle */}
      {(Icon || emoji) && (
        <div className="relative">
          {/* Iter 93 — animated bg blob */}
          <div
            className={cn(
              "absolute inset-0 -z-10 rounded-full bg-primary/8 blur-xl scale-150",
            )}
            aria-hidden="true"
          />
          <div
            className={cn(
              "relative flex items-center justify-center rounded-2xl",
              "bg-muted/60 border border-border/30",
              s.wrapper,
            )}
          >
            {/* Iter 92 — emoji or icon */}
            {emoji ? (
              <span className={s.emoji} role="img" aria-hidden="true">{emoji}</span>
            ) : Icon ? (
              <Icon className={cn(s.icon, "text-muted-foreground/60")} aria-hidden="true" />
            ) : null}
          </div>
        </div>
      )}

      <div className="max-w-[280px] space-y-1.5">
        <p className={cn("text-foreground", t.title)}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground leading-relaxed", t.desc)}>
            {description}
          </p>
        )}
      </div>

      {/* Iter 94 — action: any ReactNode */}
      {action && (
        <div className="mt-1">
          {action}
        </div>
      )}
    </div>
  )
}
