import Link from "next/link"
import { Compass } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-max-width px-margin-mobile py-10 md:px-margin-desktop md:py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex min-h-11 w-fit items-center gap-2" aria-label="Navisha home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Compass className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-foreground">Navisha</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Plan each day, see it on a map, and track spending in your currency.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Navisha. All rights reserved.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-4 uppercase tracking-widest">Product</p>
            <ul className="space-y-1">
              {[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground"
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
            <ul className="space-y-1">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Contact Us", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
