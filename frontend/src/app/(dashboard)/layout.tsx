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
      <div className="relative flex min-h-screen flex-col bg-background">
        {/* ── Animated gradient blobs (blue-spectrum, CSS-only) ── */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-[15%] -right-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[180px] animate-float-orb" />
          <div className="absolute -bottom-[15%] -left-[10%] h-[50%] w-[50%] rounded-full bg-chromatic-ocean/4 blur-[150px] animate-float-orb" style={{ animationDelay: "-6s" }} />
          <div className="absolute top-[30%] left-[20%] h-[30%] w-[30%] rounded-full bg-chromatic-aurora/3 blur-[120px] animate-float-orb" style={{ animationDelay: "-3s" }} />
        </div>

        {/* pb-24 for floating mobile nav, pt-16 for glass desktop top bar */}
        <main className="animate-fade-in flex-1 pb-24 pt-4 md:pb-8 md:pt-20">{children}</main>
        <NavBar />
        <FAB />
        {/* GDPR/CCPA: legal links accessible from every dashboard page */}
        <footer className="hidden md:block border-t border-white/10 bg-muted/20 px-4 py-4 mt-auto relative z-10">
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
