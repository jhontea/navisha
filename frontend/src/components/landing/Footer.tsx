import Link from "next/link"
import { Compass, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-gradient-to-b from-background to-muted">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 w-fit group" aria-label="Navisha home">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chromatic-aurora transition-transform group-hover:scale-105">
                <Compass className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold text-primary tracking-tight">Navisha</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The travel planning app that helps you build beautiful itineraries, track your budget, and travel smarter.
            </p>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Navisha. All rights reserved.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-4 uppercase tracking-widest">Product</p>
            <ul className="space-y-3">
              {[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Get Started", href: "/login" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-4 uppercase tracking-widest">Legal</p>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Contact Us", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            Made for travelers, by travelers
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-chromatic-ocean animate-pulse" aria-hidden="true" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
