"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Compass, ArrowRight, X, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Landing page navigation.
 * Iter 19 — sticky nav: cleaner brand, better scroll opacity, improved mobile sheet
 * Iter 20 — "How it works" link added to mobile menu
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close menu on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full h-16 transition-all duration-300",
        // Iter 19 — scrolled: stronger blur, more visible shadow
        scrolled
          ? "bg-white/95 backdrop-blur-2xl shadow-sm border-b border-border/30"
          : "bg-transparent",
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-full items-center justify-between px-4 md:px-8 max-w-6xl mx-auto">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Navisha home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(250,70%,55%)] shadow-sm group-hover:shadow-md transition-all group-hover:scale-105">
            <Compass className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          {/* Iter 19 — brand text: gradient + tighter tracking */}
          <span className="text-gradient-sunset text-[15px] font-bold tracking-tight">
            Navisha
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1" role="list">
          <a
            href="#features"
            role="listitem"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
            }}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-xl hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            role="listitem"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
            }}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-xl hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            How it works
          </a>
          {/* Iter 19 — Sign In: subtle border on scroll */}
          <Link
            href="/login"
            role="listitem"
            className={cn(
              "text-sm font-medium transition-colors px-4 py-2 rounded-xl",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              scrolled
                ? "text-foreground hover:text-primary hover:bg-primary/5"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5",
            )}
          >
            Sign In
          </Link>

          {/* CTA button */}
          <Link
            href="/login"
            role="listitem"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
              "bg-gradient-to-r from-primary to-[hsl(250,70%,55%)] text-white",
              "shadow-md shadow-primary/25",
              "hover:shadow-lg hover:shadow-primary/35 hover:scale-[1.02]",
              "active:scale-[0.98] transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          >
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className={cn(
            "sm:hidden flex h-9 w-9 items-center justify-center rounded-xl",
            "border border-border/60 text-foreground hover:bg-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <X className="h-5 w-5 transition-transform duration-200" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5 transition-transform duration-200" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Iter 20 — Mobile dropdown: includes "How it works", smooth animation */}
      <div
        id="mobile-menu"
        role="menu"
        aria-hidden={!menuOpen}
        className={cn(
          "sm:hidden absolute left-0 right-0 top-16 z-50",
          "overflow-hidden transition-all duration-200 ease-out",
          menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none",
        )}
      >
        <div className="border-t border-border/20 bg-white/98 backdrop-blur-2xl px-4 py-3 flex flex-col gap-1 shadow-lg">
          <a
            href="#features"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Features
          </a>
          {/* Iter 20 — How it works in mobile too */}
          <a
            href="#how-it-works"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            How it works
          </a>
          <Link
            href="/login"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sign In
          </Link>
          {/* CTA on mobile */}
          <Link
            href="/login"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold mt-1",
              "bg-gradient-to-r from-primary to-[hsl(250,70%,55%)] text-white",
              "shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30",
              "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            Get Started — Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
