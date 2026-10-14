import Link from "next/link"
import { BrandLogo } from "@/components/BrandLogo"

import { buttonVariants } from "@/components/ui/button"
import { MobileMenu } from "./MobileMenu"

const NAV_LINK =
  "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 h-16 w-full bg-background/90 backdrop-blur" aria-label="Main navigation">
      <div className="relative mx-auto flex h-full max-w-max-width items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link href="/" className="flex min-h-11 shrink-0 items-center rounded-full" aria-label="Navisha home">
          <BrandLogo />
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <a href="#features" className={NAV_LINK}>
            Features
          </a>
          <a href="#how-it-works" className={NAV_LINK}>
            How it works
          </a>
          <Link href="/login" prefetch={false} className={buttonVariants({ className: "ml-2" })}>
            Sign in
          </Link>
        </div>

        <MobileMenu />
      </div>
    </nav>
  )
}
