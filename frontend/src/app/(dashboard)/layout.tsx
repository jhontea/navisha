import Link from "next/link"
import { NavBar } from "@/components/NavBar"
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

          {/* Bottom padding clears the trip tab bar on phones (and the notch). */}
          <main
            id="main-content"
            className="flex-1 md:pb-10"
            style={{ paddingBottom: "max(5rem, calc(4.5rem + env(safe-area-inset-bottom)))" }}
          >
            {children}
          </main>

        {/* Footer — visible on desktop only; legal links for every dashboard page */}
        <footer className="relative z-10 mt-auto hidden border-t px-4 py-4 md:block">
          <div className="mx-auto flex max-w-max-width items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Navisha</span>
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
    </Providers>
  )
}
