import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/30 py-12">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="text-headline-sm font-bold text-primary">Navisha</div>
          <p className="text-label-sm text-muted-foreground">
            © 2026 Navisha. All rights reserved.
          </p>
        </div>
        <div className="flex gap-8">
          <Link className="text-label-md text-on-surface-variant hover:text-primary transition-colors" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-label-md text-on-surface-variant hover:text-primary transition-colors" href="/terms">
            Terms of Service
          </Link>
          <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors" href="mailto:hello@navisha.cloud">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
