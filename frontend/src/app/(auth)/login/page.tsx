import Link from "next/link"
import { Ban, Clock3 } from "lucide-react"

import { BrandLogo } from "@/components/BrandLogo"
import { LoginButton } from "@/features/auth/components/LoginButton"
import { getDefaultTripCover } from "@/features/trip/lib/cover"

// A catalog cover instead of a stock illustration (docs/DESIGN.md §7).
const COVER = getDefaultTripCover("Bali", 1280)

interface Props {
  searchParams: Promise<{ error?: string; reason?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const isNotAllowed = params.error === "not_allowed"
  const sessionExpired = params.reason === "session-expired"

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-stretch px-margin-mobile py-6 md:px-margin-desktop md:py-10">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="mx-auto flex w-full max-w-md flex-col justify-center rounded-3xl border bg-card p-6 shadow-card sm:p-10 lg:max-w-none">
            <Link href="/" className="flex min-h-11 w-fit items-center rounded-full" aria-label="Navisha home">
              <BrandLogo />
            </Link>

            <h1 className="mt-8 font-display text-3xl font-extrabold leading-tight text-foreground">
              Sign in <span className="block text-muted-foreground">and start planning</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Plan each day, see it on a map, and track spending in your currency. New here? Signing in with Google
              creates your account.
            </p>

            {isNotAllowed && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl bg-destructive-bg p-3">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">This account doesn&apos;t have access yet</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Navisha is invite-only for now. Ask the administrator to add your Google account.
                  </p>
                </div>
              </div>
            )}

            {sessionExpired && (
              <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-muted p-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Your session expired</p>
                  <p className="mt-0.5 text-muted-foreground">Sign in again to pick up where you left off.</p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <LoginButton />
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to the{" "}
              <Link href="/terms" className="font-medium text-foreground underline-offset-2 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-foreground underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <div className="bg-cover-fallback relative hidden min-h-128 overflow-hidden rounded-3xl lg:block">
            {COVER && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={COVER} alt="" className="absolute inset-0 h-full w-full object-cover object-[75%_50%]" />
            )}
            <div className="absolute inset-0 bg-linear-to-r from-black/50 via-black/15 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-10 left-10 max-w-sm text-on-cover">
              <p className="font-display text-3xl font-extrabold leading-tight">
                Every day of the trip, <span className="opacity-70">on one map.</span>
              </p>
              <p className="mt-2 text-sm font-semibold text-on-cover/80">Itinerary, bookings and budget in one place.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 px-margin-mobile py-3 sm:flex-row md:px-margin-desktop">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Navisha</p>
        <Link href="/" className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </footer>
    </main>
  )
}
