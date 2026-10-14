import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface FloatingNavItem {
  href: string
  label: string
  icon: LucideIcon
  active?: boolean
  /** Warm the data for this destination (touch start / focus). */
  onIntent?: () => void
}

/**
 * Phone navigation as a floating pill above the bottom edge (docs/DESIGN.md
 * §5 FloatingNav). The active item shows its label in a tinted pill; the rest
 * are icons with accessible names. Hidden from md up.
 */
export function FloatingNav({
  items,
  "aria-label": ariaLabel,
}: {
  items: FloatingNavItem[]
  "aria-label": string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-between gap-1 rounded-full border bg-card px-2 shadow-overlay">
        {items.map(({ href, label, icon: Icon, active, onIntent }) => (
          <li key={href} className={cn("flex", active ? "shrink-0" : "flex-1 justify-center")}>
            <Link
              href={href}
              prefetch={false}
              onTouchStart={onIntent}
              onFocus={onIntent}
              aria-current={active ? "page" : undefined}
              aria-label={active ? undefined : label}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary-soft px-4 text-primary-soft-foreground"
                  : "w-12 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
              {active && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
