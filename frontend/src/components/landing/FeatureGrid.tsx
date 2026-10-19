import { CalendarDays, Check, LogIn, Map, Sparkles, Wallet, type LucideIcon } from "lucide-react"

import { FeatureCard } from "@/components/landing/FeatureCard"
import { getCategoryColor } from "@/features/expense/categoryColors"
import { BudgetMeter } from "@/features/expense/components/BudgetMeter"
import { TimelineIcon } from "@/features/activity/components/timeline/TimelineIcon"
import { TimelineRow } from "@/features/activity/components/timeline/TimelineRow"
import { cn } from "@/lib/utils"

// Sample content only; it mirrors the app's own timeline and budget UI.
const itineraryVisual = (
  <div>
    <p className="mb-2 px-1 font-display text-base font-extrabold text-foreground">
      Day 1 <span className="text-muted-foreground">· Sun, 10 May</span>
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
  <div>
    <p className="mb-3 px-1 font-display text-base font-extrabold text-foreground">
      Day 2 <span className="text-muted-foreground">· 4 stops</span>
    </p>
    <div className="relative">
      {/* Dashed route behind the numbered pins. */}
      <span className="absolute inset-y-3.5 left-3.5 -translate-x-1/2 border-l-2 border-dashed border-primary/40" />
      <ol className="relative space-y-5">
        {[
          { place: "Senso-ji", leg: null },
          { place: "Ueno Park", leg: "25 min walk" },
          { place: "Ameyoko", leg: "10 min walk" },
          { place: "Hotel in Ueno", leg: "5 min walk" },
        ].map(({ place, leg }, i) => (
          <li key={place} className="flex items-center gap-3 text-sm text-foreground">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground ring-2 ring-card">
              {i + 1}
            </span>
            {place}
            {leg && <span className="ml-auto text-xs text-muted-foreground">{leg}</span>}
          </li>
        ))}
      </ol>
    </div>
  </div>
)

const aiVisual = (
  <div className="space-y-3">
    <p className="ml-auto w-fit max-w-xs rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
      3 days in Tokyo, food and temples
    </p>
    <ul className="space-y-2">
      {[
        { day: "Day 1", title: "Asakusa and Senso-ji", keep: true },
        { day: "Day 2", title: "Tsukiji food walk", keep: true },
        { day: "Day 3", title: "Shibuya at night", keep: false },
      ].map(({ day, title, keep }) => (
        <li key={day} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
              keep ? "border-primary bg-primary text-primary-foreground" : "border-input",
            )}
          >
            {keep && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-extrabold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{day}</p>
          </div>
        </li>
      ))}
    </ul>
  </div>
)

const SAMPLE_SPEND = { accommodation: 42000, transport: 18000, food: 16000, souvenir: 8000 }

const budgetVisual = (
  <div>
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Spent</span>
      <span className="font-semibold text-foreground tabular-nums">¥ 84,000 of ¥ 120,000</span>
    </div>
    <BudgetMeter className="mt-2" label="Sample budget" budget={120000} byCategory={SAMPLE_SPEND} />
    <p className="mt-2 text-xs text-muted-foreground tabular-nums">¥ 36,000 left · ≈ Rp 3,960,000</p>
    <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
      {Object.entries(SAMPLE_SPEND).map(([key, amount]) => (
        <li key={key} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getCategoryColor(key).bar)} />
          <span className="text-foreground">{getCategoryColor(key).label}</span>
          <span className="ml-auto text-muted-foreground tabular-nums">¥ {amount.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
  </div>
)

function SampleCard({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="font-display text-sm font-extrabold text-foreground">{title}</p>
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
        <h2 id="features-heading" className="text-center font-display text-3xl font-extrabold text-foreground md:text-4xl">
          What you can do <span className="text-muted-foreground">in one place</span>
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
            visual={aiVisual}
          />
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="mx-auto max-w-max-width scroll-mt-20 px-margin-mobile pb-16 md:px-margin-desktop"
      >
        <h2 id="how-heading" className="text-center font-display text-3xl font-extrabold text-foreground md:text-4xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-extrabold text-primary-soft-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-lg font-extrabold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
