"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, Map, DollarSign, Bus, Hotel } from "lucide-react"

interface TripTabBarProps {
  tripId: string
}

const TABS = [
  { label: "Overview",  href: "overview",   icon: Map,         key: "overview"   },
  { label: "Itinerary", href: "",            icon: Calendar,    key: "itinerary"  },
  { label: "Transport", href: "transport",   icon: Bus,         key: "transport"  },
  { label: "Stay",      href: "stay",        icon: Hotel,       key: "stay"       },
  { label: "Budget",    href: "budget",      icon: DollarSign,  key: "budget"     },
] as const

/**
 * Tab bar for trip detail sub-pages.
 * Iter 46 — sticky below TopBar (top offset matches TopBar height)
 * Iter 47 — active: gradient underline pill, not just color
 * Iter 48 — icons on all tabs (not just mobile)
 * Iter 49 — scrollable on mobile with snap
 * Iter 50 — hide label on xs, show on sm+
 */
export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "sticky z-30 top-[calc(3rem+1px)] md:top-[calc(3.5rem+1px)]",
        "bg-background/90 backdrop-blur-xl border-b border-border/20",
        "shadow-[0_1px_0_0_hsl(var(--border)/0.15)]",
      )}
      aria-label="Trip sections"
    >
      <div
        className="flex overflow-x-auto scrollbar-none px-2 md:px-4 gap-0.5 max-w-6xl mx-auto snap-x snap-mandatory"
        role="tablist"
      >
        {TABS.map((tab) => {
          const href = tab.href ? `/trips/${tripId}/${tab.href}` : `/trips/${tripId}`
          const isActive = tab.href === ""
            ? pathname === `/trips/${tripId}`
            : pathname.startsWith(`/trips/${tripId}/${tab.href}`)

          return (
            <Link
              key={tab.href}
              href={href}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "relative flex shrink-0 snap-start items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                "rounded-t-lg",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {/* Iter 48 — icons always shown */}
              <tab.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />

              {/* Iter 50 — label: hidden on xs, visible on sm+ */}
              <span className="hidden sm:inline">{tab.label}</span>

              {/* Iter 47 — active: gradient underline */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-[hsl(250,70%,55%)]"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
