import Image from "next/image"
import Link from "next/link"
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
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-margin-mobile py-8 md:px-margin-desktop">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          <section className="mx-auto w-full max-w-md rounded-xl border bg-card p-6 sm:p-8">
            <Link href="/" className="flex min-h-11 w-fit items-center gap-2" aria-label="Navisha home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-foreground">Navisha</span>
            </Link>

            <h1 className="mt-6 text-2xl font-semibold text-foreground">Sign in to Navisha</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Plan each day, see it on a map, and track spending in your currency. New here? Signing in with Google
              creates your account.
            </p>

            {isNotAllowed && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
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
              <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
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

          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <Image
              src={loginIllustration}
              alt="Traveler with a suitcase and a map"
              placeholder="blur"
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 28rem, 1px"
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 border-t px-margin-mobile py-3 sm:flex-row md:px-margin-desktop">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Navisha</p>
        <Link href="/" className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </footer>
    </main>
  )
}
