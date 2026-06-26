"use client"

import Link from "next/link"
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
        {/* GDPR/CCPA: legal links accessible from every dashboard page */}
        <footer className="hidden md:block border-t bg-muted/30 px-4 py-4 mt-auto">
          <div className="mx-auto flex max-w-max-width items-center justify-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <span>© {new Date().getFullYear()} Navisha</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
