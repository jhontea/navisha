"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ArrowLeftRight, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth, useLogout } from "@/features/auth/hooks"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Converter", href: "/currency", icon: ArrowLeftRight },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { mutate: logout, isPending: loggingOut } = useLogout()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      {/* Profile popover */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
      {profileOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-64 rounded-xl border bg-background shadow-lg p-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-12 w-12 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { logout(); setProfileOpen(false) }}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not signed in</p>
          )}
        </div>
      )}

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background px-6 py-3 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}

        {/* Profile button */}
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
            profileOpen ? "text-primary" : "text-muted-foreground",
          )}
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-5 w-5 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          Profile
        </button>
      </div>
    </>
  )
}
