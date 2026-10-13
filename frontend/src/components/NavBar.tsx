"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Compass } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks";
import { tripApi } from "@/features/trip/api";
import type { TripListResponse } from "@/features/trip/types";

/**
 * Global top bar: logo (→ Trips, the home) and avatar (→ Profile). The app
 * has two destinations, so there is no menu; creating a trip is an action on
 * the Trips page. Inside a trip on phones the bar is hidden: the trip header
 * has its own back button and the trip tabs sit at the bottom.
 */
export function NavBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const inTrip = /^\/trips\/(?!new$|generate$)[^/]+/.test(pathname);
  const profileActive = pathname.startsWith("/profile") || pathname.startsWith("/currency");

  function prefetchTrips() {
    void queryClient.prefetchInfiniteQuery({
      queryKey: ["trips", "list"],
      queryFn: ({ pageParam }) => tripApi.list({ cursor: pageParam as string, limit: 20 }),
      initialPageParam: "",
      getNextPageParam: (last: TripListResponse) => last.next_cursor || undefined,
    });
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 h-14 items-center border-b bg-background/95 backdrop-blur",
          inTrip ? "hidden md:flex" : "flex",
        )}
      >
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 md:px-6" aria-label="Main navigation">
          <Link
            href="/trips"
            onMouseEnter={prefetchTrips}
            onFocus={prefetchTrips}
            aria-current={pathname === "/trips" ? "page" : undefined}
            className="flex h-11 shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">Navisha</span>
            <span className="sr-only">: Trips</span>
          </Link>

          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            aria-label={isLoading ? "Loading profile" : `Profile: ${user?.name ?? "Account"}`}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-lg px-1.5 text-sm font-medium transition-colors md:px-2.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              profileActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isLoading ? (
              <Skeleton variant="avatar" className="h-8 w-8" />
            ) : (
              <UserAvatar key={user?.id} src={user?.avatar_url} name={user?.name} decorative className="h-8 w-8" />
            )}
            <span className="hidden md:inline">{user?.name?.split(" ")[0] ?? "Profile"}</span>
          </Link>
        </nav>
      </header>
    </>
  );
}
