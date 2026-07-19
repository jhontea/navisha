import Link from "next/link"
import { Compass } from "lucide-react"
import { LoginButton } from "@/features/auth/components/LoginButton"

interface Props {
  searchParams: Promise<{ error?: string; reason?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const isNotAllowed = params.error === "not_allowed"
  const sessionExpired = params.reason === "session-expired"

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Background — animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-chromatic-sunset/15 blur-[150px] animate-float-orb" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-chromatic-ocean/12 blur-[150px] animate-float-orb" style={{ animationDelay: "-6s" }} />
        <div className="absolute top-[40%] left-[30%] h-[30%] w-[30%] rounded-full bg-chromatic-aurora/8 blur-[120px] animate-float-orb" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10 min-h-screen gap-8">
        <div className="glass-lg w-full max-w-[420px] rounded-2xl p-8 md:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <Link href="/" className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-md transition-transform hover:scale-105">
              <Compass className="h-6 w-6 text-white" aria-hidden="true" />
            </Link>
            <Link href="/" className="text-gradient-sunset text-headline-md font-bold tracking-tight hover:opacity-80 transition-opacity">
              Navisha
            </Link>
            <p className="text-headline-sm text-foreground mt-2">Welcome back</p>
            <p className="text-body-sm text-muted-foreground mt-1 text-center">
              Your next adventure awaits
            </p>
          </div>

          {/* Access denied */}
          {isNotAllowed && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <span className="material-symbols-outlined text-destructive text-[18px] mt-0.5 shrink-0">block</span>
              <div>
                <p className="text-sm font-semibold text-destructive">Access restricted</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Your account is not on the allowed list. Please contact the administrator.
                </p>
              </div>
            </div>
          )}

          {/* Session expired */}
          {sessionExpired && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">schedule</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Your session has expired</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Please sign in again to continue planning your trip.
                </p>
              </div>
            </div>
          )}

          {/* Login */}
          <LoginButton />
        </div>

        {/* Trust signals */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground/60 relative z-10">
          {[
            "Free forever",
            "No credit card",
            "Cancel anytime",
          ].map((label) => (
            <span key={label} className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-chromatic-ocean/60" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 border-t border-border/30 relative z-10 text-center">
        <div className="flex items-center gap-2">
          <span className="text-gradient-sunset font-bold text-sm">Navisha</span>
          <span className="text-body-sm text-muted-foreground">&copy; 2026 Navisha Travel. All rights reserved.</span>
        </div>
        <div className="flex gap-6 flex-wrap justify-center">
          <Link href="/privacy" className="text-body-sm text-muted-foreground hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-body-sm text-muted-foreground hover:text-primary transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </main>
  )
}
