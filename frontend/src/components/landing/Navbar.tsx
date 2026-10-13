import Link from "next/link"
import { Compass } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { MobileMenu } from "./MobileMenu"

const NAV_LINK =
  "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-16 w-full border-b bg-background" aria-label="Main navigation">
      <div className="relative mx-auto flex h-full max-w-max-width items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2" aria-label="Navisha home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-foreground">Navisha</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <a href="#features" className={NAV_LINK}>
            Features
          </a>
          <a href="#how-it-works" className={NAV_LINK}>
            How it works
          </a>
          <Link href="/login" className={buttonVariants({ className: "ml-2" })}>
            Sign in
          </Link>
        </div>

        <MobileMenu />
      </div>
    </nav>
  )
}
