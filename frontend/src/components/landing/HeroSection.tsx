import Link from "next/link"

export function HeroSection() {
  return (
    <section className="flex flex-col items-center text-center py-20 md:py-32 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed mb-6 border border-outline-variant/30">
        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        <span className="text-label-sm font-label-sm">New: AI Itinerary Generator</span>
      </div>
      <h1 className="font-display text-display text-on-surface mb-6 max-w-3xl leading-tight">
        Travel Smarter, <br className="hidden md:block" /> Not Harder
      </h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-2xl mx-auto">
        The modern planner for adventurous souls. Organize your itineraries, track expenses, and manage logistics all in one beautiful interface.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link href="/login">
          <button className="group flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </Link>
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-primary font-label-md text-label-md px-8 py-4 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all">
            View Demo
          </button>
        </Link>
      </div>
    </section>
  )
}
