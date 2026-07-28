"use client"

import Link from "next/link"
import {
  ArrowLeftRight,
  BadgeCheck,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Shield,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth, useLogout } from "@/features/auth/hooks"
import { StatsSection } from "@/features/trip/components/StatsSection"

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </h2>
      <span className="h-px flex-1 bg-border/40" aria-hidden="true" />
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const { mutate: logout, isPending: loggingOut } = useLogout()

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in px-margin-mobile pb-28 pt-4 md:px-margin-desktop md:pb-8 md:pt-6">
      <header className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Account overview
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and see your travel progress.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass-lg overflow-hidden rounded-3xl">
          <div className="relative h-24 overflow-hidden bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean" aria-hidden="true">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/20 bg-white/10" />
            <div className="absolute left-8 top-12 h-16 w-16 rounded-full border border-white/15 bg-white/5" />
            <div className="absolute right-20 top-8 h-2 w-2 rounded-full bg-white/70" />
          </div>

          <div className="px-6 pb-6 text-center">
            {isLoading ? (
              <div className="flex min-h-[236px] flex-col items-center" aria-label="Loading profile">
                <Skeleton variant="avatar" className="-mt-11 mb-4 h-[88px] w-[88px] ring-4 ring-background" />
                <Skeleton variant="text" className="mb-2 h-6 w-36" />
                <Skeleton variant="text" className="mb-5 h-4 w-48" />
                <Skeleton variant="glass" className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="relative mx-auto -mt-11 mb-4 w-fit rounded-full bg-background p-1 shadow-lg shadow-primary/15">
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={user.id}
                      src={user.avatar_url}
                      alt={user.name ?? "User avatar"}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/25"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chromatic-aurora text-3xl font-bold text-white ring-2 ring-primary/25"
                      aria-label={`Avatar for ${user?.name ?? "user"}`}
                    >
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-chromatic-ocean text-white">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>

                <h2 className="font-heading text-xl font-bold text-foreground">
                  {user?.name ?? "Traveler"}
                </h2>
                {user?.email && (
                  <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                )}

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google account connected
                </div>

                <p className="mt-5 border-t border-border/40 pt-5 text-xs leading-relaxed text-muted-foreground">
                  Your trips, preferences, and travel statistics stay connected to this account.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => logout()}
              disabled={loggingOut}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
              aria-busy={loggingOut}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="stats-heading">
            <div id="stats-heading">
              <SectionHeading>Travel stats</SectionHeading>
            </div>
            <StatsSection />
          </section>

          <section aria-labelledby="account-heading">
            <div id="account-heading">
              <SectionHeading>Preferences &amp; access</SectionHeading>
            </div>
            <div className="glass overflow-hidden rounded-2xl divide-y divide-border/30">
              <Link
                href="/currency"
                className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-chromatic-aurora to-chromatic-ocean text-white shadow-sm shadow-primary/20">
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">Currency converter</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Convert supported currencies for your next trip.</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-3 px-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chromatic-ocean/10 text-chromatic-ocean">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">Account security</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Authentication is managed securely through Google.</span>
                </span>
                <span className="rounded-full bg-chromatic-ocean/10 px-2.5 py-1 text-[11px] font-semibold text-chromatic-ocean">
                  Connected
                </span>
              </div>
            </div>
          </section>

          <section className="md:hidden" aria-label="Legal and support links">
            <SectionHeading>Legal &amp; support</SectionHeading>
            <div className="glass overflow-hidden rounded-2xl divide-y divide-border/30">
              {[
                { href: "/privacy", label: "Privacy Policy", icon: Shield },
                { href: "/terms", label: "Terms of Service", icon: FileText },
                { href: "/contact", label: "Contact Us", icon: Mail },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
