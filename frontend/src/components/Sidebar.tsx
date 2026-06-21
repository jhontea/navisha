"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  Plane,
  Hotel,
  Wallet,
  Compass,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth, useLogout } from "@/features/auth/hooks"
import { useTrip } from "@/features/trip/hooks/useTrips"

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  disabled?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Trips", href: "/trips", icon: Compass },
  { label: "Converter", href: "/currency", icon: ArrowLeftRight },
]

const TRIP_NAV = [
  { label: "Itinerary", href: "", icon: CalendarDays },
  { label: "Transport", href: "/transport", icon: Plane },
  { label: "Stay", href: "/stay", icon: Hotel },
  { label: "Budget", href: "/budget", icon: Wallet },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { mutate: logout, isPending: loggingOut } = useLogout()

  // Extract tripId from /trips/[id] or /trips/[id]/* paths
  const tripMatch = pathname.match(/^\/trips\/([^/]+)/)
  const tripId = tripMatch ? tripMatch[1] : null
  const isOnTripPage = !!tripId && tripId !== "new"

  // Fetch trip detail only when on a trip page (for trip name)
  const { data: trip } = useTrip(tripId ?? "")

  const isNewTrip = pathname === "/trips/new"

  return (
    <aside className="z-50 hidden h-screen w-72 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="p-8">
        <Link href="/dashboard" className="text-2xl font-bold text-primary">
          Navisha
        </Link>
      </div>

      {/* Main nav */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4">
        <nav className="space-y-1">
          <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Main
          </p>
          {MAIN_NAV.map((item) => {
            // Dashboard is active when on /dashboard OR /trips/new
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && isNewTrip)
            const Icon = item.icon
            const baseClasses =
              "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all"
            const stateClasses = active
              ? "bg-primary/10 text-primary"
              : item.disabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"

            if (item.disabled) {
              return (
                <span
                  key={item.label}
                  className={cn(baseClasses, stateClasses)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
              )
            }
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(baseClasses, stateClasses)}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      !active && "group-hover:text-primary",
                    )}
                  />
                  {item.label}
                </Link>

                {/* Sub-item: Add New Trip — only under Dashboard, only when on /trips/new */}
                {item.href === "/dashboard" && isNewTrip && (
                  <Link
                    href="/trips/new"
                    className="ml-8 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary bg-primary/5 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      add_circle
                    </span>
                    Add New Trip
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Active Trip navigation — only when on /trips/[id] */}
        {isOnTripPage && (
          <nav className="space-y-1">
            <div className="mb-2 px-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Active Trip
              </p>
              {trip && (
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {trip.title}
                </p>
              )}
            </div>

            {TRIP_NAV.map((item) => {
              const fullHref = `/trips/${tripId}${item.href}`
              // Itinerary is active when exactly on /trips/[id] or /trips/[id]/
              const active =
                item.href === ""
                  ? pathname === `/trips/${tripId}` || pathname === `/trips/${tripId}/`
                  : pathname.startsWith(fullHref)
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={fullHref}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      !active && "group-hover:text-primary",
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      {/* Footer: user info + logout only */}
      <div className="border-t p-4">
        {isLoading ? (
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        ) : user ? (
          <div className="flex items-center gap-3 rounded-xl p-2">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-10 w-10 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              aria-label="Log out"
              onClick={() => logout()}
              disabled={loggingOut}
              className="shrink-0 rounded-lg p-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
              title="Logout"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
