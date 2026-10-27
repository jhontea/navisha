import { Providers } from "@/components/providers"
import { DashboardRuntime } from "@/components/DashboardRuntime"
import { ErrorBoundary } from "@/components/ErrorBoundary"

/** Signed-in pages without the app chrome (no NavBar, tabs or footer), e.g. the printable itinerary. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardRuntime />
      <ErrorBoundary>
        <div className="min-h-screen bg-background">{children}</div>
      </ErrorBoundary>
    </Providers>
  )
}
