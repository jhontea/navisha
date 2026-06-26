"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Hotel,
  LayoutDashboard,
  Plane,
  Wallet,
} from "lucide-react";

const TABS = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Itinerary", href: "", icon: CalendarDays },
  { label: "Transport", href: "/transport", icon: Plane },
  { label: "Stay", href: "/stay", icon: Hotel },
  { label: "Budget", href: "/budget", icon: Wallet },
] as const;

/** Horizontal scrollable pill tab bar for trip sub-navigation.
 *  Phase 3B-2: replaces the separate "Back to Trip Overview" links
 *  with native-app-style top tabs. */
export function TripTabBar({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav
      className="glass sticky top-14 z-30 flex flex-nowrap gap-0.5 overflow-x-auto justify-start md:justify-center px-3 py-2 no-scrollbar mx-auto w-full max-w-max-width md:top-20"
      role="tablist"
      aria-label="Trip sections"
    >
      {TABS.map((tab) => {
        const href = tab.href === "" ? base : `${base}${tab.href}`;
        // Itinerary (empty href) is the default — only active when pathname
        // exactly matches the base (not a sub-route like /overview, /transport, etc.)
        const isActive =
          tab.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chromatic-sunset md:px-3 md:py-2.5",
              isActive
                ? "bg-gradient-to-r from-chromatic-sunset to-chromatic-sky text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
          >
            <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
