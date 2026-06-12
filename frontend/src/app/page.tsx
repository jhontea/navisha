import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            N
          </div>
          <span className="font-semibold">Navisha</span>
        </div>
        <Link href="/login">
          <Button size="sm">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plan your journey.
            <br />
            Own your adventure.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Build day-by-day itineraries, track your budget, and visualize your
            route — all in one place.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button size="lg">Get started</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
