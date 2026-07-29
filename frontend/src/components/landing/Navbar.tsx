import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { MobileMenu } from "./MobileMenu"

export function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 h-16 w-full border-b border-border/30 bg-white/90 shadow-sm backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Navisha home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md">
            <Compass className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="text-gradient-sunset text-[15px] font-bold tracking-tight">
            Navisha
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <a
            href="#features"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            How it works
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chromatic-aurora px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Start Planning
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <MobileMenu />
      </div>
    </nav>
  )
}
