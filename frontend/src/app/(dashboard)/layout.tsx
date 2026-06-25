"use client"

import { MobileNav } from "@/components/MobileNav"
import { Sidebar } from "@/components/Sidebar"
import { useTokenRefresh } from "@/features/auth/hooks"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Silently refresh the access token every 10 minutes while the user is
  // active. Stops refreshing after 30 minutes of inactivity so the token
  // can expire naturally in the background.
  useTokenRefresh()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
