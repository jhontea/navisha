"use client"

import Link from "next/link"
import { useAuth, useLogout } from "@/features/auth/hooks"
import { StatsSection } from "@/features/trip/components/StatsSection"
import { ArrowLeftRight, LogOut, ChevronRight, Shield, FileText, Mail } from "lucide-react"

/**
 * Profile page — Iter 86-92
 * 86: Avatar ring gradient
 * 87: Section headers: unified pill-style uppercase labels
 * 88: Account actions: settings-list style (not just logout)
 * 89: Legal links: list-style, more accessible tap targets
 * 90: Logout: full-width button with destructive styling
 * 91: Subtle entrance animation
 * 92: Max-width constraint for readability
 */
export default function ProfilePage() {
  const { user } = useAuth()
  const { mutate: logout, isPending: loggingOut } = useLogout()

  return (
    <div className="mx-auto w-full max-w-max-width px-margin-mobile md:px-margin-desktop pt-6 pb-28 animate-fade-in">

      {/* Page header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and travel stats
        </p>
      </header>

      {/* Iter 86 — Profile card: gradient ring, larger avatar */}
      <div className="glass-lg mb-6 rounded-2xl p-6 flex flex-col items-center text-center">
        <div className="mb-4 p-0.5 rounded-full bg-gradient-to-br from-[hsl(var(--chromatic-sunset))] via-[hsl(var(--chromatic-aurora))] to-[hsl(var(--chromatic-sky))] shadow-lg">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.name ?? "User avatar"}
              className="h-20 w-20 rounded-full border-2 border-background object-cover"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--chromatic-sunset))] via-[hsl(var(--chromatic-aurora))] to-[hsl(var(--chromatic-sky))] border-2 border-background text-3xl font-bold text-white"
              aria-label={`Avatar for ${user?.name ?? "user"}`}
            >
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground font-heading">
          {user?.name ?? "Traveler"}
        </h2>
        {user?.email && (
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        )}

        {/* Joined via Google */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Signed in with Google
        </div>
      </div>

      {/* Travel stats */}
      <section className="mb-6" aria-labelledby="stats-heading">
        {/* Iter 87 — pill-style section heading */}
        <div className="mb-3 flex items-center gap-2">
          <span
            id="stats-heading"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Travel Stats
          </span>
          <span className="flex-1 h-px bg-border/40" aria-hidden="true" />
        </div>
        <StatsSection />
      </section>

      {/* Iter 88 — Account section: list of rows */}
      <section className="mb-6" aria-labelledby="account-heading">
        <div className="mb-3 flex items-center gap-2">
          <span
            id="account-heading"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Account
          </span>
          <span className="flex-1 h-px bg-border/40" aria-hidden="true" />
        </div>

        <div className="glass rounded-2xl overflow-hidden divide-y divide-border/30">
          {/* Currency */}
          <Link
            href="/currency"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/20">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Currency Converter</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>

          {/* Iter 90 — Logout row */}
          <button
            type="button"
            onClick={() => logout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-destructive/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-destructive disabled:opacity-50"
            aria-busy={loggingOut}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <LogOut className="h-4 w-4 text-destructive" aria-hidden="true" />
            </div>
            <span className="flex-1 text-sm font-medium text-destructive">
              {loggingOut ? "Signing out…" : "Sign Out"}
            </span>
          </button>
        </div>
      </section>

      {/* Iter 89 — Legal: list rows with icons + accessible tap targets */}
      <section aria-label="Legal and support links">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Legal
          </span>
          <span className="flex-1 h-px bg-border/40" aria-hidden="true" />
        </div>
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border/30">
          <Link
            href="/privacy"
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-sm text-foreground">Privacy Policy</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          </Link>
          <Link
            href="/terms"
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-sm text-foreground">Terms of Service</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-sm text-foreground">Contact Us</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* App version */}
      <p className="mt-6 text-center text-xs text-muted-foreground/50">
        Navisha
      </p>
    </div>
  )
}
