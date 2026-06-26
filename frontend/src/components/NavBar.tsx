"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Trips", href: "/trips", icon: Compass },
  { label: "Profile", href: "/profile", icon: User },
] as const;

/** Responsive navigation — glass top bar (desktop) / floating glass bottom (mobile). */
export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop: glass top bar with chromatic bottom border ── */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 hidden md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="glass mx-auto mt-3 flex w-full max-w-max-width items-center justify-between rounded-2xl px-6 py-3">
          {/* Brand — gradient text */}
          <Link
            href="/dashboard"
            className="text-gradient-sunset text-lg font-bold tracking-tight"
          >
            Navisha
          </Link>
          {/* Nav links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile: floating glass bottom nav ── */}
      <nav
        className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="glass mx-auto flex max-w-md items-center justify-around rounded-2xl px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-[11px] font-medium transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 transition-colors", isActive && "text-primary")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.label}
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
