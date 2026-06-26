import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-24 text-center max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
      <div className="glass-lg relative overflow-hidden rounded-[40px] p-12 md:p-20">
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-chromatic-primary/8 blur-[100px]" />
        <div className="relative z-10">
          <h2 className="font-heading text-headline-lg md:text-display text-foreground mb-4">
            Ready for your next adventure?
          </h2>
          <p className="text-body-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Plan, track, and discover — all in one place. Free to start, no credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-chromatic-primary to-chromatic-primary-light px-10 py-5 text-sm font-semibold text-white shadow-lg shadow-chromatic-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
          <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
          </svg>
          Get Started with Google
        </Link>
        </div>
      </div>
    </section>
  )
}
