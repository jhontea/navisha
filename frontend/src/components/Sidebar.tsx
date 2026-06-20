"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeftRight,
  Bell,
  Compass,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth, useLogout } from "@/features/auth/hooks"

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  disabled?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Converter", href: "/currency", icon: ArrowLeftRight },
  { label: "Explore", href: "#", icon: Compass, disabled: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { mutate: logout, isPending: loggingOut } = useLogout()

  return (
    <aside className="z-50 hidden h-screen w-72 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="p-8">
        <Link href="/dashboard" className="text-2xl font-bold text-primary">
          Navisha
        </Link>
      </div>

      {/* Main nav */}
      <div className="flex-1 space-y-8 overflow-y-auto px-4">
        <nav className="space-y-1">
          <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Main
          </p>
          {MAIN_NAV.map((item) => {
            const active = pathname === item.href
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
              <Link
                key={item.href}
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
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t p-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-full p-2 transition-colors hover:bg-muted/60"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-background bg-destructive" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="rounded-full p-2 transition-colors hover:bg-muted/60"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            type="button"
            aria-label="Log out"
            onClick={() => logout()}
            disabled={loggingOut}
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
          >
            {loggingOut ? "…" : "Logout"}
          </button>
        </div>

        {isLoading ? (
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        ) : user ? (
          <div className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60">
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
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
