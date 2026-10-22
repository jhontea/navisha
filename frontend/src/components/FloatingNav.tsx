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
 * §5 FloatingNav). Every item is an icon with a small label; the active one
 * sits in a tinted pill. Hidden from md up.
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
      <ul className="mx-auto flex h-16 max-w-md items-center gap-1 rounded-full border bg-card px-2 shadow-overlay">
        {items.map(({ href, label, icon: Icon, active, onIntent }) => (
          <li key={href} className="flex min-w-0 flex-1">
            <Link
              href={href}
              prefetch={false}
              onTouchStart={onIntent}
              onFocus={onIntent}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-xs font-bold leading-none transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
