import Link from "next/link"
import { Sparkles, CheckCircle } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 md:py-28 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
      <div className="relative overflow-hidden rounded-[40px] bg-on-primary-fixed p-12 md:p-20 text-center">
        {/* Background dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient blobs */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-[80px]" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/5 blur-[80px]" aria-hidden="true" />

        <div className="relative z-10">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium">Free forever, no credit card</span>
          </div>

          <h2 className="font-display text-headline-lg md:text-[52px] md:leading-[60px] text-white mb-5 tracking-tight text-balance">
            Ready for your next adventure?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto leading-relaxed text-balance">
            Join thousands of travelers who plan smarter, spend less, and explore more with Navisha.
          </p>

          {/* CTA Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-4 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Start Planning with Google
          </Link>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            {[
              "No credit card",
              "Cancel anytime",
              "Free forever plan",
            ].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-white/60 shrink-0" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
