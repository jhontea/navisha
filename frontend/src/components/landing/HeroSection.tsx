import Image from "next/image"
import Link from "next/link"

import { GoogleIcon } from "@/components/GoogleIcon"
import { buttonVariants } from "@/components/ui/button"
import travelHeroIllustration from "@/assets/illustrations/travel-hero.png"

export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-max-width items-center gap-10 px-margin-mobile pb-16 pt-12 md:px-margin-desktop md:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="text-center lg:text-left">
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
          Plan each day, see it on a map, and track spending in your currency.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
          Navisha puts your activities, flights and hotels on one timeline per day, shows each day on a map, and
          keeps your budget in the trip&apos;s currency. Start from scratch or let AI draft the days for you.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
          <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Continue with Google
          </Link>
          <a href="#how-it-works" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
            See how it works
          </a>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Free to use. Works in your browser on phone and desktop.</p>
      </div>

      <div className="mx-auto w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[460px]">
        <Image
          src={travelHeroIllustration}
          alt="Traveler planning a route with a map, itinerary, and suitcase"
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) 460px, (min-width: 640px) 400px, 320px"
          className="h-auto w-full"
        />
      </div>
    </section>
  )
}
