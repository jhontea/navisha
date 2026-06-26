import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center text-center py-20 md:py-32 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-chromatic-sunset/20 blur-[128px] animate-float-orb" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-chromatic-ocean/15 blur-[128px] animate-float-orb" style={{ animationDelay: "-6s" }} />
      </div>

      <h1 className="font-display text-display-lg md:text-[72px] md:leading-[84px] text-foreground mb-6 max-w-4xl leading-tight">
        Your Journey,{" "}
        <span className="text-gradient-sunset">Beautifully Planned</span>
      </h1>
      <p className="text-body-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
        Build day-by-day itineraries, track your budget in any currency, and let AI
        craft the perfect trip — all in one place.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link
          href="/login"
          className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-chromatic-sunset via-chromatic-aurora to-chromatic-sky px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-chromatic-sunset/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-chromatic-sunset/40 active:scale-[0.98] bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%] transition-[background-position] duration-500"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
          </svg>
          Start Planning Free
        </Link>
      </div>
    </section>
  )
}
