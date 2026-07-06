"use client"

import Link from "next/link"
import { NavBar } from "@/components/NavBar"
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
        {/* ── Ambient gradient blobs (CSS-only, pointer-events off) ── */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-[15%] -right-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[180px] animate-float-orb" />
          <div className="absolute -bottom-[15%] -left-[10%] h-[50%] w-[50%] rounded-full bg-chromatic-ocean/4 blur-[150px] animate-float-orb" style={{ animationDelay: "-6s" }} />
          <div className="absolute top-[30%] left-[20%] h-[30%] w-[30%] rounded-full bg-chromatic-aurora/3 blur-[120px] animate-float-orb" style={{ animationDelay: "-3s" }} />
        </div>

        {/* Main content — pb-28 for floating mobile nav clearance, safe-area bottom for notched phones */}
        {/* pt-14 = 56px on desktop matches flush fixed NavBar height (h-14) */}
        <main id="main-content" className="animate-fade-in flex-1 pb-28 pt-4 md:pb-10 md:pt-14" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
          {children}
        </main>

        <NavBar />

        {/* Footer — visible on desktop only; legal links for every dashboard page */}
        <footer className="hidden md:block border-t border-white/10 bg-muted/20 px-4 py-4 mt-auto relative z-10">
          <div className="mx-auto flex max-w-max-width items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="text-gradient-sunset font-semibold">Navisha</span>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <span className="text-muted-foreground/40">·</span>
            <span>© {new Date().getFullYear()} Navisha Travel</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
