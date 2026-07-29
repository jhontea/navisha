import Link from "next/link"
import Image from "next/image"
import { Ban, Clock3, Compass } from "lucide-react"
import { LoginButton } from "@/features/auth/components/LoginButton"
import loginIllustration from "@/assets/illustrations/login.png"

interface Props {
  searchParams: Promise<{ error?: string; reason?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const isNotAllowed = params.error === "not_allowed"
  const sessionExpired = params.reason === "session-expired"

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="auth-orb absolute -left-[10%] -top-[20%] h-[50%] w-[50%] animate-float-orb rounded-full bg-chromatic-sunset/15 blur-[150px]" />
        <div className="auth-orb absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] animate-float-orb rounded-full bg-chromatic-ocean/12 blur-[150px]" style={{ animationDelay: "-6s" }} />
        <div className="auth-orb absolute left-[30%] top-[40%] h-[30%] w-[30%] animate-float-orb rounded-full bg-chromatic-aurora/8 blur-[120px]" style={{ animationDelay: "-3s" }} />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-6 sm:py-8 md:px-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/55 shadow-2xl shadow-primary/10 backdrop-blur-xl lg:h-[min(680px,calc(100dvh-112px))] lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr] lg:rounded-[36px]">
          <section className="relative hidden overflow-hidden bg-gradient-to-br from-primary/12 via-chromatic-sky/10 to-chromatic-ocean/12 p-10 lg:flex lg:flex-col">
            <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary) / 0.18) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

            <Link href="/" className="relative z-10 flex w-fit items-center gap-2.5" aria-label="Navisha home">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-md">
                <Compass className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="text-gradient-sunset text-lg font-bold tracking-tight">Navisha</span>
            </Link>

            <div className="relative z-10 mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Plan with confidence</p>
              <h1 className="mt-3 max-w-md font-display text-4xl font-bold leading-tight text-foreground">
                Your next journey starts here.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Keep your itinerary, travel budget, and route organized in one beautiful place.
              </p>
            </div>

            <div className="relative z-10 mt-4 min-h-0 flex-1">
              <Image
                src={loginIllustration}
                alt="Traveler ready to continue a secure journey"
                loading="lazy"
                fill
                className="object-contain object-bottom"
                sizes="(min-width: 1024px) 48vw, 1px"
              />
            </div>
          </section>

          <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <Link href="/" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden" aria-label="Navisha home">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-md">
                <Compass className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="text-gradient-sunset text-lg font-bold tracking-tight">Navisha</span>
            </Link>

            <div className="mb-8">
              <p className="text-sm font-semibold text-primary">Welcome to Navisha</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Continue your journey
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sign in or create an account with Google to start planning your next adventure.
              </p>
            </div>

            {isNotAllowed && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <Ban className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Access restricted</p>
                  <p className="mt-0.5 text-xs text-destructive/80">
                    Your account is not on the allowed list. Please contact the administrator.
                  </p>
                </div>
              </div>
            )}

            {sessionExpired && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <Clock3 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Your session has expired</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Please sign in again to continue planning your trip.
                  </p>
                </div>
              </div>
            )}

            <LoginButton />

            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="font-medium text-foreground hover:text-primary">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="font-medium text-foreground hover:text-primary">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </div>

      <footer className="relative z-10 flex w-full flex-col items-center justify-between gap-2 border-t border-border/30 px-margin-mobile py-4 text-center sm:flex-row md:px-margin-desktop">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Navisha. All rights reserved.</p>
        <Link href="/" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          Back to home
        </Link>
      </footer>
    </main>
  )
}
