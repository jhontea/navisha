"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Compass,
  LayoutDashboard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Trips", href: "/trips", icon: Compass },
  { label: "Currency", href: "/currency", icon: ArrowLeftRight },
  { label: "Profile", href: "/profile", icon: User },
] as const;

/** Responsive navigation — bottom tabs on mobile, top header on desktop. */
export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop: top header bar ── */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 hidden border-b bg-background/95 backdrop-blur-sm md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-max-width items-center justify-between px-margin-mobile py-3 md:px-margin-desktop">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-primary"
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
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm safe-area-bottom md:hidden"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-max-width items-center justify-around px-margin-mobile py-2">
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
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-primary")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
