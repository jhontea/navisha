"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Compass,
  LayoutDashboard,
  User,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { currencyApi } from "@/features/currency/api";
import { useAuth } from "@/features/auth/hooks";
import { tripApi } from "@/features/trip/api";
import type { TripListResponse } from "@/features/trip/types";

const NAV_ITEMS = [
  { label: "Home",     href: "/dashboard", icon: LayoutDashboard },
  { label: "My Trips", href: "/trips",     icon: Compass },
  { label: "Currency", href: "/currency",  icon: ArrowLeftRight },
  { label: "Profile",  href: "/profile",   icon: User },
] as const;

/**
 * Responsive navigation.
 * Iter 21 — desktop: tighter brand, improved active pill, notification dot slot
 * Iter 22 — mobile bottom bar: larger touch targets, label always shown, active indicator refined
 * Iter 23 — skip-to-content link improved styling
 * Iter 24 — profile avatar: ring animation on active
 */
export function NavBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const prevPath = useRef(pathname);
  const [bouncing, setBouncing] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setBouncing(pathname);
      const t = setTimeout(() => setBouncing(null), 400);
      prevPath.current = pathname;
      return () => clearTimeout(t);
    }
  }, [pathname]);

  function prefetchNav(href: string) {
    if (href === "/dashboard") {
      void queryClient.prefetchQuery({
        queryKey: ["trips", "upcoming", 6],
        queryFn: () => tripApi.listUpcoming(6),
        staleTime: 2 * 60 * 1000,
      });
      return;
    }

    if (href === "/trips") {
      void queryClient.prefetchInfiniteQuery({
        queryKey: ["trips", "list"],
        queryFn: ({ pageParam }) =>
          tripApi.list({ cursor: pageParam as string, limit: 20 }),
        initialPageParam: "",
        getNextPageParam: (last: TripListResponse) => last.next_cursor || undefined,
      });
      return;
    }

    if (href === "/currency") {
      void queryClient.prefetchQuery({
        queryKey: ["currency", "supported"],
        queryFn: () => currencyApi.supported(),
        staleTime: 60 * 60 * 1000,
      });
    }
  }

  return (
    <>
      {/* Iter 23 — Skip to main content: larger, more polished */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:shadow-primary/30"
      >
        Skip to main content
      </a>

      {/* ── Desktop: fixed top bar ── */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 hidden md:flex h-14 items-center",
          "transition-all duration-300",
          scrolled
            ? "bg-background/95 backdrop-blur-2xl border-b border-border/40 shadow-[0_1px_0_0_hsl(var(--border)/0.3)]"
            : "bg-background/90 backdrop-blur-xl border-b border-border/30",
        )}
        role="banner"
      >
        <nav
          className="flex w-full items-center justify-between px-4 md:px-6 max-w-6xl mx-auto"
          aria-label="Main navigation"
        >
          {/* Brand */}
          <Link
            href="/dashboard"
            onPointerEnter={() => prefetchNav("/dashboard")}
            onTouchStart={() => prefetchNav("/dashboard")}
            onFocus={() => prefetchNav("/dashboard")}
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="Navisha home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-sm group-hover:shadow-md transition-all group-hover:scale-105">
              <Compass className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            {/* Iter 21 — gradient brand text */}
            <span className="text-gradient-sunset text-[15px] font-bold tracking-tight">
              Navisha
            </span>
          </Link>

          {/* Nav links — centred */}
          <div className="flex items-center gap-0.5" role="list">
            {NAV_ITEMS.slice(0, 3).map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const isBouncing = bouncing
                ? (item.href === "/dashboard"
                    ? bouncing === "/dashboard"
                    : bouncing.startsWith(item.href))
                : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onPointerEnter={() => prefetchNav(item.href)}
                  onTouchStart={() => prefetchNav(item.href)}
                  onFocus={() => prefetchNav(item.href)}
                  role="listitem"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  {/* Iter 21 — active: bottom indicator dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-300",
                      isActive ? "text-primary" : "text-muted-foreground",
                      isBouncing && "animate-bounce",
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side: avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Iter 24 — Profile: ring animation when active */}
            <Link
              href="/profile"
              onPointerEnter={() => prefetchNav("/profile")}
              onTouchStart={() => prefetchNav("/profile")}
              onFocus={() => prefetchNav("/profile")}
              aria-current={pathname === "/profile" ? "page" : undefined}
              aria-label={`View profile: ${user?.name ?? "Account"}`}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                pathname === "/profile"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.name ?? "User avatar"}
                  className={cn(
                    "h-7 w-7 rounded-full object-cover border-2 shadow-sm transition-all",
                    pathname === "/profile"
                      ? "border-primary/60 shadow-primary/20"
                      : "border-white/40",
                  )}
                />
              ) : (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chromatic-aurora text-xs font-bold text-white shadow-sm"
                  aria-hidden="true"
                >
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <span className="hidden xl:inline text-sm leading-tight">
                <span className="text-[11px] text-muted-foreground block leading-none">Hi,</span>
                <span className="font-semibold">{user?.name?.split(" ")[0] ?? "Profile"}</span>
              </span>
              <span className="hidden lg:inline xl:hidden text-sm font-medium">
                {user?.name?.split(" ")[0] ?? "Profile"}
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Mobile: floating glass bottom nav ── */}
      {/* Iter 22 — larger, more floating, label always visible */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "mx-3 mb-3 flex items-center justify-around rounded-2xl border border-border/40 bg-background/95 px-1 pt-2 shadow-xl backdrop-blur-2xl",
            "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            "transition-all duration-300",
            scrolled && "shadow-2xl",
          )}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const isBouncing = bouncing
              ? (item.href === "/dashboard"
                  ? bouncing === "/dashboard"
                  : bouncing.startsWith(item.href))
              : false;
            return (
              <Link
                key={item.href}
                href={item.href}
                onPointerEnter={() => prefetchNav(item.href)}
                onTouchStart={() => prefetchNav(item.href)}
                onFocus={() => prefetchNav(item.href)}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "group relative flex min-h-[52px] min-w-[52px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2",
                  "text-[11px] font-medium",
                  "transition-all duration-200 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {/* Iter 22 — active: top pill indicator */}
                {isActive && (
                  <span
                    className="absolute top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                {/* Iter 22 — icon chip */}
                <span
                  className={cn(
                    "flex h-8 w-9 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10"
                      : "group-hover:bg-muted/60",
                  )}
                >
                  {item.href === "/profile" && user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "h-5 w-5 rounded-full object-cover",
                        isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      )}
                    />
                  ) : (
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isActive ? "text-primary" : "text-muted-foreground",
                        isBouncing && "animate-bounce",
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden="true"
                    />
                  )}
                </span>
                {/* Iter 22 — label always visible */}
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
