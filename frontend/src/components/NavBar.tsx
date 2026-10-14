"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Compass, Home, Sparkles, UserRound } from "lucide-react";

import { FloatingNav } from "@/components/FloatingNav";
import { UserAvatar } from "@/components/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks";
import { tripApi } from "@/features/trip/api";
import type { TripListResponse } from "@/features/trip/types";

/**
 * Global navigation (docs/DESIGN.md §4.3). Desktop: top bar with the logo,
 * section pills and the avatar. Phones: a slim top bar plus a floating nav at
 * the bottom. Inside a trip on phones both are hidden: the trip cover has its
 * own back button and the trip sections take the floating nav.
 */
export function NavBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const inTrip = /^\/trips\/(?!new$|generate$)[^/]+/.test(pathname);
  const sections = {
    trips: pathname === "/trips" || pathname === "/dashboard" || pathname === "/trips/new",
    ai: pathname.startsWith("/trips/generate"),
    currency: pathname.startsWith("/currency"),
    profile: pathname.startsWith("/profile"),
  };

  function prefetchTrips() {
    void queryClient.prefetchInfiniteQuery({
      queryKey: ["trips", "list"],
      queryFn: ({ pageParam }) => tripApi.list({ cursor: pageParam as string, limit: 20 }),
      initialPageParam: "",
      getNextPageParam: (last: TripListResponse) => last.next_cursor || undefined,
    });
  }

  const desktopLinks = [
    { href: "/trips", label: "Trips", active: sections.trips || inTrip, onIntent: prefetchTrips },
    { href: "/trips/generate", label: "Plan with AI", active: sections.ai },
    { href: "/currency", label: "Currency", active: sections.currency },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 h-16 items-center bg-background/90 backdrop-blur",
          inTrip ? "hidden md:flex" : "flex",
        )}
      >
        <nav className="mx-auto flex w-full max-w-max-width items-center gap-6 px-4 md:px-6" aria-label="Main navigation">
          <Link
            href="/trips"
            onMouseEnter={prefetchTrips}
            onFocus={prefetchTrips}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Compass className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-black tracking-tight text-foreground">Navisha</span>
            <span className="sr-only">: Trips</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {desktopLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onMouseEnter={link.onIntent}
                  onFocus={link.onIntent}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    link.active
                      ? "bg-primary-soft text-primary-soft-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/profile"
            aria-current={sections.profile ? "page" : undefined}
            aria-label={isLoading ? "Loading profile" : `Profile: ${user?.name ?? "Account"}`}
            className={cn(
              "ml-auto flex h-11 shrink-0 items-center gap-2 rounded-full p-1 text-sm font-bold transition-colors md:pr-4",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              sections.profile ? "bg-primary-soft text-primary-soft-foreground" : "text-foreground hover:bg-card",
            )}
          >
            {isLoading ? (
              <Skeleton variant="avatar" className="h-9 w-9" />
            ) : (
              <UserAvatar key={user?.id} src={user?.avatar_url} name={user?.name} decorative className="h-9 w-9" />
            )}
            <span className="hidden md:inline">{user?.name?.split(" ")[0] ?? "Profile"}</span>
          </Link>
        </nav>
      </header>

      {!inTrip && (
        <FloatingNav
          aria-label="Main navigation"
          items={[
            { href: "/trips", label: "Trips", icon: Home, active: sections.trips, onIntent: prefetchTrips },
            { href: "/trips/generate", label: "Plan with AI", icon: Sparkles, active: sections.ai },
            { href: "/currency", label: "Currency", icon: ArrowLeftRight, active: sections.currency },
            { href: "/profile", label: "Profile", icon: UserRound, active: sections.profile },
          ]}
        />
      )}
    </>
  );
}
