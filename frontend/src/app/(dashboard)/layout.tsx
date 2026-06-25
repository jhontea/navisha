"use client"

import { NavBar } from "@/components/NavBar"
import { FAB } from "@/components/FAB"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useTokenRefresh } from "@/features/auth/hooks"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useTokenRefresh()

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-background">
        {/* pb-20 for mobile bottom nav, pt-14 for desktop top nav */}
        <main className="animate-fade-in flex-1 pb-20 pt-0 md:pb-8 md:pt-14">{children}</main>
        <NavBar />
        <FAB />
      </div>
    </ErrorBoundary>
  )
}
