"use client"

import Link from "next/link"
import { useEffect, useId, useRef, type ComponentType } from "react"

import { ActivePill } from "@/components/ActivePill"
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
  const pillId = useId()
  const navRef = useRef<HTMLElement>(null)
  const activeHref = items.find((item) => item.active)?.href
  // Sticky like NavBar: a navigation that resets the scroll would fly the pill in from the
  // old scroll position, so it moves instantly when the page is scrolled.
  const scrolled = typeof window !== "undefined" && window.scrollY > 0

  // Only when the bar overflows, so the page itself never scrolls for this.
  useEffect(() => {
    const nav = navRef.current
    if (nav && nav.scrollWidth > nav.clientWidth) {
      nav.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" })
    }
  }, [activeHref])

  return (
    <nav ref={navRef} aria-label={ariaLabel} className={cn("max-w-full overflow-x-auto scrollbar-none", className)}>
      <ul className="isolate inline-flex gap-1 rounded-full bg-card p-1 shadow-card">
        {items.map(({ href, label, icon: Icon, active, onIntent }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch={false}
              onMouseEnter={onIntent}
              onFocus={onIntent}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && <ActivePill layoutId={pillId} instant={scrolled} />}
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
