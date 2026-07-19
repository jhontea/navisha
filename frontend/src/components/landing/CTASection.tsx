import Link from "next/link"
import { Sparkles, CheckCircle } from "lucide-react"
import { GoogleIcon } from "@/components/GoogleIcon"

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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm whitespace-nowrap">
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
            <GoogleIcon className="h-5 w-5 shrink-0" />
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
