import Link from "next/link"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export interface TabPillItem {
  href: string
  label: string
  icon?: ComponentType<{ className?: string }>
  active?: boolean
  /** Warm the data for this tab (hover / focus). */
  onIntent?: () => void
}

/**
 * Page-level tabs as pills in a floating card (docs/DESIGN.md §5 TabPills).
 * The active tab is a soft tint, not a solid block. Navigation links, so the
 * active one carries aria-current="page".
 */
export function TabPills({
  items,
  className,
  "aria-label": ariaLabel,
}: {
  items: TabPillItem[]
  className?: string
  "aria-label": string
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("max-w-full overflow-x-auto [scrollbar-width:none]", className)}>
      <ul className="inline-flex gap-1 rounded-full bg-card p-1 shadow-card">
        {items.map(({ href, label, icon: Icon, active, onIntent }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch={false}
              onMouseEnter={onIntent}
              onFocus={onIntent}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
