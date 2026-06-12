import { LoginButton } from "@/features/auth/components/LoginButton"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            N
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Navisha</h1>
          <p className="text-sm text-muted-foreground">
            Plan your journey. Own your adventure.
          </p>
        </div>

        {/* Login card */}
        <div className="w-full rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to access your trips
              </p>
            </div>
            <LoginButton />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <span className="underline underline-offset-2">Terms of Service</span>{" "}
          and{" "}
          <span className="underline underline-offset-2">Privacy Policy</span>.
        </p>
      </div>
    </main>
  )
}
