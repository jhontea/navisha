"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Sparkles, User, type LucideIcon } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks";
import { tripApi } from "@/features/trip/api";
import type { TripListResponse } from "@/features/trip/types";

type NavItem = {
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

// Global navigation (D3, docs/PLANNING_REFACTOR_REDESIGN.md B3): Trips is
// home, one AI entry point, Profile (which also holds tools like the
// currency converter).
const NAV_ITEMS: NavItem[] = [
  {
    label: "Trips",
    shortLabel: "Trips",
    href: "/trips",
    icon: Compass,
    isActive: (p) => p.startsWith("/trips") && !p.startsWith("/trips/generate"),
  },
  {
    label: "Generate with AI",
    shortLabel: "Generate",
    href: "/trips/generate",
    icon: Sparkles,
    isActive: (p) => p.startsWith("/trips/generate"),
  },
  {
    label: "Profile",
    shortLabel: "Profile",
    href: "/profile",
    icon: User,
    isActive: (p) => p.startsWith("/profile") || p.startsWith("/currency"),
  },
];

export function NavBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  function prefetchTrips() {
    void queryClient.prefetchInfiniteQuery({
      queryKey: ["trips", "list"],
      queryFn: ({ pageParam }) => tripApi.list({ cursor: pageParam as string, limit: 20 }),
      initialPageParam: "",
      getNextPageParam: (last: TripListResponse) => last.next_cursor || undefined,
    });
  }

  const profile = NAV_ITEMS[2];
  const profileActive = profile.isActive(pathname);
  // Inside a trip the trip tab bar takes the bottom of the screen on phones
  // (one navigation bar at a time).
  const inTrip = /^\/trips\/(?!new$|generate$)[^/]+/.test(pathname);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* ── Desktop: fixed top bar ── */}
      <header
        className="fixed inset-x-0 top-0 z-50 hidden h-14 items-center border-b bg-background/95 backdrop-blur md:flex"
        role="banner"
      >
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6" aria-label="Main navigation">
          <Link
            href="/trips"
            onMouseEnter={prefetchTrips}
            onFocus={prefetchTrips}
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Navisha home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">Navisha</span>
          </Link>

          <ul className="flex items-center gap-1">
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const active = item.isActive(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onMouseEnter={item.href === "/trips" ? prefetchTrips : undefined}
                    onFocus={item.href === "/trips" ? prefetchTrips : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            aria-label={isLoading ? "Loading profile" : `Profile: ${user?.name ?? "Account"}`}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              profileActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isLoading ? (
              <Skeleton variant="avatar" className="h-7 w-7" />
            ) : (
              <UserAvatar key={user?.id} src={user?.avatar_url} name={user?.name} decorative className="h-7 w-7" />
            )}
            <span className="hidden lg:inline">{user?.name?.split(" ")[0] ?? "Profile"}</span>
          </Link>
        </nav>
      </header>

      {/* ── Mobile: bottom bar (hidden inside a trip) ── */}
      {!inTrip && (
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main navigation"
      >
        <ul className="flex items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            const showAvatar = item.href === "/profile" && !isLoading && user?.avatar_url;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {showAvatar ? (
                    <UserAvatar
                      key={user.id}
                      src={user.avatar_url}
                      name={user.name}
                      decorative
                      className={cn("h-6 w-6", active && "ring-2 ring-primary ring-offset-1 ring-offset-background")}
                    />
                  ) : (
                    <item.icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  )}
                  <span className="leading-none">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      )}
    </>
  );
}
