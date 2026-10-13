import { CalendarDays, LogIn, Map, Sparkles, Wallet, type LucideIcon } from "lucide-react"

import { FeatureCard } from "@/components/landing/FeatureCard"
import { TimelineIcon } from "@/features/activity/components/timeline/TimelineIcon"
import { TimelineRow } from "@/features/activity/components/timeline/TimelineRow"

// Sample content only; it mirrors the app's own timeline and budget UI.
const itineraryVisual = (
  <div>
    <p className="mb-2 px-1 text-sm font-semibold text-foreground">
      Day 1 <span className="font-normal text-muted-foreground">· Sun, 10 May</span>
    </p>
    <TimelineRow time="06:30" icon={<TimelineIcon kind="transport" transportType="flight" />}>
      <SampleCard title="Flight · NH 836" meta="Jakarta → Tokyo Narita" />
    </TimelineRow>
    <TimelineRow time={null} icon={<TimelineIcon kind="stay" />}>
      <SampleCard title="Check-in · Hotel in Ueno" meta="2 nights" />
    </TimelineRow>
    <TimelineRow time="19:00" icon={<TimelineIcon kind="location" />} className="[&>div:last-child]:pb-0">
      <SampleCard title="Dinner in Ameyoko" meta="19:00–20:30" />
    </TimelineRow>
  </div>
)

const mapVisual = (
  <ol className="space-y-2">
    {["Senso-ji", "Ueno Park", "Ameyoko"].map((place, i) => (
      <li key={place} className="flex items-center gap-3 text-sm text-foreground">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {i + 1}
        </span>
        {place}
      </li>
    ))}
  </ol>
)

const budgetVisual = (
  <div>
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Spent</span>
      <span className="font-semibold text-foreground tabular-nums">¥ 84,000 of ¥ 120,000</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full w-[70%] rounded-full bg-primary" />
    </div>
    <p className="mt-2 text-xs text-muted-foreground tabular-nums">¥ 36,000 left · ≈ Rp 3,960,000</p>
  </div>
)

function SampleCard({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{meta}</p>
    </div>
  )
}

const STEPS: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: LogIn, title: "Sign in with Google", desc: "No password or forms. Your trips are saved to your account." },
  {
    Icon: Sparkles,
    title: "Create or generate a trip",
    desc: "Set the dates and add days yourself, or answer a few questions and get a draft to edit.",
  },
  {
    Icon: CalendarDays,
    title: "Plan, map and track",
    desc: "Add activities, flights and hotels, check each day on the map, and log what you spend.",
  },
]

export function FeatureGrid() {
  return (
    <>
      <section
        id="features"
        aria-labelledby="features-heading"
        className="mx-auto max-w-max-width scroll-mt-20 px-margin-mobile py-16 md:px-margin-desktop"
      >
        <h2 id="features-heading" className="text-center text-3xl font-semibold text-foreground">
          What you can do
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          The parts of a trip that usually live in five different apps, in one place.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <FeatureCard
            Icon={CalendarDays}
            title="One timeline per day"
            description="Activities keep your order; flights and hotel check-ins slot in by time, so the day reads top to bottom."
            visual={itineraryVisual}
          />
          <FeatureCard
            Icon={Map}
            title="Each day on a map"
            description="See the day's places in order, with the route between them. Tap a place to open it in Google Maps."
            visual={mapVisual}
          />
          <FeatureCard
            Icon={Wallet}
            title="Budget in any currency"
            description="Log expenses in the currency you paid; totals convert to the trip's base currency, by category and by day."
            visual={budgetVisual}
          />
          <FeatureCard
            Icon={Sparkles}
            title="AI drafts you review"
            description="Get a suggested day or a whole trip from a few answers. Nothing is added until you pick what to keep."
          />
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="mx-auto max-w-max-width scroll-mt-20 px-margin-mobile pb-16 md:px-margin-desktop"
      >
        <h2 id="how-heading" className="text-center text-3xl font-semibold text-foreground">
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
