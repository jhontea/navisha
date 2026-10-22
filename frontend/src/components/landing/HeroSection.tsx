import { buttonVariants } from "@/components/ui/button"
import { getDefaultTripCover } from "@/features/trip/lib/cover"
import { SessionCta } from "./SessionCta"
import { BoardingPass } from "@/features/transportation/components/BoardingPass"

// A real catalog cover and a real boarding pass: the hero shows the product, not a stock illustration.
const COVER = getDefaultTripCover("Tokyo", 1920)

const SAMPLE_FLIGHT = {
  type: "flight",
  label: "NH 836",
  operator: "ANA",
  from_location: "Soekarno-Hatta (CGK), Jakarta",
  to_location: "Narita (NRT), Tokyo",
  departure_datetime: "2026-05-10T06:30:00",
  arrival_datetime: "2026-05-10T15:40:00",
  reference_number: "",
}

export function HeroSection() {
  return (
    <section className="mx-auto max-w-max-width px-margin-mobile pb-12 pt-4 md:px-margin-desktop md:pt-6">
      <div className="bg-cover-fallback relative overflow-hidden rounded-3xl">
        {COVER && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={COVER}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[70%_50%]"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-black/55 via-black/20 to-transparent" aria-hidden="true" />
        {/* Below lg the text spans the whole cover, so darken all of it for contrast. */}
        <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/60 to-black/65 lg:hidden" aria-hidden="true" />

        <div className="relative grid items-center gap-10 px-6 py-12 sm:px-10 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-14 lg:py-20">
          <div className="text-on-cover">
            <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-5xl lg:text-6xl">
              Plan every day.
              <span className="block opacity-70">See it on the map.</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base font-semibold leading-relaxed text-on-cover/85 md:text-lg">
              Activities, flights and hotels on one timeline per day, each day on a map, and your budget in the
              trip&apos;s currency. Start from scratch or let AI draft the days for you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SessionCta google className={buttonVariants({ variant: "cover", size: "lg", className: "w-full sm:w-auto" })} />
              <a
                href="#how-it-works"
                className={buttonVariants({
                  size: "lg",
                  className: "w-full bg-on-cover/15 text-on-cover hover:bg-on-cover/25 sm:w-auto",
                })}
              >
                See how it works
              </a>
            </div>
            <p className="mt-3 text-sm font-semibold text-on-cover/75">Free to use. Works in your browser on phone and desktop.</p>
          </div>

          {/* Product shot: the same boarding pass the app draws. */}
          <div className="hidden lg:block" aria-hidden="true">
            <BoardingPass transportation={SAMPLE_FLIGHT} dayNumber={1} className="ml-auto max-w-sm -rotate-2 shadow-overlay" />
          </div>
        </div>
      </div>
    </section>
  )
}
