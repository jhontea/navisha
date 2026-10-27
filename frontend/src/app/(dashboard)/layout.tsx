import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { OfflineBanner } from "@/components/OfflineBanner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Providers } from "@/components/providers"
import { DashboardRuntime } from "@/components/DashboardRuntime"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <DashboardRuntime />
      <ErrorBoundary>
        <div className="relative flex min-h-screen flex-col bg-background">
          <NavBar />
          <OfflineBanner />

          {/* Bottom padding clears the floating nav on phones (and the notch). */}
          <div
            id="main-content"
            className="flex-1 pb-[max(6.5rem,calc(5.75rem+env(safe-area-inset-bottom)))] md:pb-10"
          >
            {children}
          </div>

        {/* Footer — visible on desktop only; legal links for every dashboard page */}
        <footer className="relative z-10 mt-auto hidden border-t px-4 py-4 md:block">
          <div className="mx-auto flex max-w-max-width items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Navisha</span>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/privacy" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">Terms of Service</Link>
            <Link href="/contact" className="inline-flex min-h-6 items-center transition-colors hover:text-foreground">Contact</Link>
            <span className="text-muted-foreground/40">·</span>
            <span>© {new Date().getFullYear()} Navisha Travel</span>
          </div>
        </footer>
        </div>
      </ErrorBoundary>
    </Providers>
  )
}
